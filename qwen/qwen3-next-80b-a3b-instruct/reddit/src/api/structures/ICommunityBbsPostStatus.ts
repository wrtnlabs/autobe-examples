import { tags } from "typia";

export namespace ICommunityBbsPostStatus {
  /**
   * Request DTO for creating a new post status code for content moderation.
   * Each status code defines a category for content moderation actions such
   * as 'review_required', 'blocked', or 'flagged'. Must have a unique name
   * and machine-readable code for integration with automated moderation
   * systems. Color provides visual prioritization in moderation dashboards.
   */
  export type ICreate = {
    /**
     * Color for visual representation of this post status in moderation
     * dashboards. Format should be a valid hex color code (e.g., '#FF0000'
     * for red, '#000000' for black). If not provided, the system will use
     * '#000000' as the default. Can be null to use default color.
     *
     * @x-autobe-specification Direct mapping from community_bbs_post_statuses.color column. If not provided in request, defaults to '#000000' (black) in the backend.
     */
    color?: (string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">) | null | undefined;

    /**
     * Human-readable name identifying the post status purpose (e.g.,
     * 'review_required', 'blocked'). Must be unique within the system.
     *
     * @x-autobe-specification Direct mapping from community_bbs_post_statuses.name column. Must be unique across all post status records.
     */
    name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Machine-readable code for the post status. Must be 2-6 uppercase
     * English letters (A-Z) without spaces or special characters. Example:
     * 'REQL', 'BLKD', 'FLAG'. Must be unique within the system.
     *
     * @x-autobe-specification Direct mapping from community_bbs_post_statuses.code column. Must be unique across all post status records and match format [A-Z]{2,6}.
     */
    code: string & tags.Pattern<"^[A-Z]{2,6}$">;
  };
}
