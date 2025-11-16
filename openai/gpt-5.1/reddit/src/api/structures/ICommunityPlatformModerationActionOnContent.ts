import { tags } from "typia";

import { ICommunityPlatformModerationAction } from "./ICommunityPlatformModerationAction";
import { ICommunityPlatformPost } from "./ICommunityPlatformPost";
import { ICommunityPlatformComment } from "./ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace ICommunityPlatformModerationActionOnContent {
  /**
   * Inverted DTO representing a content-targeted moderation action and its
   * context.
   *
   * This schema is used as the response body for GET
   * /communityPlatform/adminUser/moderationActions/{moderationActionId}/content
   * and centers the specialization row from
   * community_platform_moderation_actions_on_content as the root entity. It
   * embeds the parent moderation action header and the affected content
   * entities in a way that avoids circular references while giving moderators
   * a single, consolidated view of what was moderated.
   *
   * The DTO is intended for administrative and moderation tooling operated by
   * adminUser actors. It is read-only and may expose sensitive or abusive
   * content, so access must be tightly controlled by the backend
   * authorization layer.
   */
  export type IInvert = {
    /**
     * Primary key for the content-targeted moderation action record in
     * community_platform_moderation_actions_on_content.
     *
     * This identifier uniquely distinguishes a specific specialization row
     * that links a moderation action header to a concrete piece of content
     * (post or comment). It is useful when debugging or auditing the
     * linkage model itself.
     *
     * Clients generally do not construct new identifiers of this type; they
     * are assigned by the backend when the specialization record is
     * created.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderation action header associated with this content-targeted
     * specialization.
     *
     * This object is the parent entity stored in
     * community_platform_moderation_actions and contains generic
     * enforcement metadata such as action type, scope, policy category,
     * actor admin user, and lifecycle timestamps.
     *
     * Embedding it here allows moderators to understand the broader
     * decision context without issuing a separate API call, while still
     * avoiding reverse collections that could create circular references.
     */
    moderation_action: ICommunityPlatformModerationAction;

    /**
     * Nullable summary of the post directly affected by this moderation
     * action.
     *
     * When non-null, this field provides a compact view of the
     * community_platform_posts record that was targeted, including
     * identifiers and key status flags. It is used when the action applies
     * to a specific post rather than to a comment.
     *
     * The field is null when the moderation action instead targets a
     * comment or when no post-level association exists.
     */
    target_post?: ICommunityPlatformPost.ISummary | null | undefined;

    /**
     * Nullable summary of the comment directly affected by this moderation
     * action.
     *
     * When non-null, this field provides a compact view of the
     * community_platform_comments record that was targeted, including
     * identifiers, a concise body, and basic status flags. It is used when
     * the action applies to a specific comment or comment thread.
     *
     * The field is null when the moderation action targets a post instead
     * or when no comment-level association exists.
     */
    target_comment?: ICommunityPlatformComment.ISummary | null | undefined;

    /**
     * Nullable summary of the community that contains the moderated
     * content.
     *
     * When non-null, this field describes the
     * community_platform_communities row in which the affected post or
     * comment resides, providing key identifiers and governance-related
     * flags. It helps moderators quickly understand the environment and
     * ruleset under which the content was created.
     *
     * Null values are expected only in rare transitional or data-recovery
     * scenarios where community resolution is not possible.
     */
    community?: ICommunityPlatformCommunity.ISummary | null | undefined;

    /**
     * Timestamp when this content-target specialization record was created.
     *
     * The value usually matches or closely follows the created_at of the
     * parent moderation action header, indicating when the link between the
     * action and the specific piece of content was recorded.
     *
     * It is managed exclusively by the backend and is included here for
     * completeness in audit views and sorting.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Nullable soft-deletion timestamp for the content-target
     * specialization record.
     *
     * A non-null value indicates that the specialization row has been
     * retired from standard linkage use, even though the parent moderation
     * action may still exist in the system for audit purposes. A null value
     * indicates that the record is active and should be considered part of
     * the current mapping between the action and its content target.
     *
     * Moderation and administrative tools typically hide or de-emphasize
     * records with non-null deleted_at values in routine views, while still
     * allowing access through dedicated audit interfaces.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
