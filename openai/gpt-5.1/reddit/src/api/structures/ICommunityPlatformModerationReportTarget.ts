import { tags } from "typia";

import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace ICommunityPlatformModerationReportTarget {
  /**
   * Polymorphic summary descriptor for the reported target of a moderation
   * report.
   *
   * This DTO is a compact, virtual projection that carries just enough
   * information about the reported object to render moderation queues,
   * dashboards, and case timelines without fetching full entity payloads.
   *
   * It can represent posts, comments, communities, or user accounts in a
   * unified way, keyed by `type` and `target_id`, and optionally enriched
   * with a community summary, a human-readable title or name, and a short
   * content snippet.
   *
   * Client applications use this type alongside the main report summary to
   * show context about what is being reported and to decide which specialized
   * API endpoints and UI views to invoke when more detail is needed.
   */
  export type ISummary = {
    /**
     * Target kind identifier that mirrors the parent report summary type.
     *
     * Typical values include `post`, `comment`, `community`, or `user`. It
     * allows consumers to understand which domain object the remaining
     * fields refer to and to choose appropriate icons, labels, and
     * navigation actions.
     *
     * The value should always be consistent with the `type` field on
     * `ICommunityPlatformModerationReport.ISummary` so that report lists
     * and detail pages can reason about the target in a predictable way.
     */
    type: string;

    /**
     * Identifier of the concrete domain entity that was reported.
     *
     * Depending on `type`, this may be a post ID, comment ID, community ID,
     * or member user ID drawn from the corresponding Prisma model.
     *
     * Moderation tooling uses this value to deep-link into specialized
     * views or detail pages for the underlying object, and API consumers
     * can pass it back into type-specific endpoints to fetch full entity
     * representations.
     */
    target_id: string & tags.Format<"uuid">;

    /**
     * Optional community summary providing container context for the
     * reported object.
     *
     * For post and comment reports, this references the community in which
     * the content resides using `ICommunityPlatformCommunity.ISummary` so
     * moderation queues can display community name and basic metadata
     * without separate lookups.
     *
     * For community or user reports this field may be null or omitted
     * depending on implementation, as there may not be a single obvious
     * container community.
     */
    community?: ICommunityPlatformCommunity.ISummary | undefined;

    /**
     * Optional human-readable title or display name associated with the
     * target.
     *
     * For posts and communities this is typically the post title or
     * community name. For user reports it may be the display name or
     * username of the reported account.
     *
     * For comment reports it can be null or a generated label indicating
     * that the target is a comment, since comments may not have standalone
     * titles.
     */
    title_or_name?: string | null | undefined;

    /**
     * Optional short snippet of content text to provide quick context for
     * moderators.
     *
     * For posts or comments, this typically contains a trimmed and
     * sanitized excerpt of the body that helps reviewers understand the
     * allegation at a glance.
     *
     * For community or user reports it may be null or contain a short
     * description derived from profile or community metadata, depending on
     * business rules and privacy constraints.
     */
    content_snippet?: string | null | undefined;
  };
}
