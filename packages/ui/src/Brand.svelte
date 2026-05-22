<script lang="ts">
  /**
   * Split-colour wordmark used by every bimmerz app:
   *   `INPAX`, `NCSX`, `EDIABASX`, `XBUSX` — the body in the primary
   * text colour, the suffix in the per-app accent. Mirrors the
   * convention each app set independently; centralised here so any
   * future re-skin only touches one file.
   *
   * Pass `body` + `suffix` to render. Default styling is `text-sm
   * font-bold tracking-wide`; override via the `class` prop if a
   * larger size is needed (welcome screen vs. top bar).
   */
  interface Props {
    body: string;
    suffix: string;
    /** Extra Tailwind classes appended to the default wordmark sizing. */
    class?: string;
  }

  const { body, suffix, class: extraClass = "" }: Props = $props();
</script>

<span class="text-sm font-bold tracking-wide {extraClass}">
  <span class="text-foreground">{body}</span><span class="text-accent">{suffix}</span>
</span>
