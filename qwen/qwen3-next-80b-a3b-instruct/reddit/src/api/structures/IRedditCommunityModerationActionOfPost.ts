import { tags } from "typia";

export namespace IRedditCommunityModerationActionOfPost {
  /**
   * Request body for submitting a moderation action to enforce community rules. Includes the type of content being moderated (post or comment), the action to perform (delete, ban, approve, dismiss), and the reason provided by the moderator or administrator. All actions are permanently logged as audit entries.
   */
  export type ICreate = {
    /**
     * The type of content being moderated: either 'post' or 'comment'.
     *
     * @x-autobe-database-schema-property target_type
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.target_type. Must be either 'post' or 'comment' as defined in enum.
     */
    target_type: "post" | "comment";

    /**
     * The moderation action to be performed: 'delete', 'ban', 'approve', or 'dismiss'.
     *
     * @x-autobe-database-schema-property action_type
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.action_type. Must be one of: 'delete', 'ban', 'approve', or 'dismiss' as defined in enum.
     */
    action_type: "delete" | "ban" | "approve" | "dismiss";

    /**
     * The reason provided by the moderator or administrator for taking this moderation action.
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.reason. UTF-8 string with maximum 500 characters length as enforced by database constraint.
     */
    reason: string & tags.MaxLength<500>;
  };

  /**
   * Request parameters for filtering and paginating moderation actions performed by moderators and administrators.
   */
  export type IRequest = {
    /**
     * Type of content targeted by the moderation action: 'post' or 'comment'.
     *
     * @x-autobe-database-schema-property target_type
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.target_type. Must be 'post' or 'comment'.
     */
    target_type?: "post" | "comment" | undefined;

    /**
     * Type of moderation action performed: 'delete', 'ban', 'approve', or 'dismiss'.
     *
     * @x-autobe-database-schema-property action_type
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.action_type. Must be 'delete', 'ban', 'approve', or 'dismiss'.
     */
    action_type?: "delete" | "ban" | "approve" | "dismiss" | undefined;

    /**
     * Unique identifier of the moderator or administrator who performed the action.
     *
     * @x-autobe-database-schema-property actor_id
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.actor_id. UUID referencing the actor's session.
     */
    actor_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Only include moderation actions created after this date and time (ISO 8601).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filters records where created_at is after this timestamp. Directly maps to reddit_community_moderation_actions.created_at.
     */
    created_at_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Only include moderation actions created before this date and time (ISO 8601).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filters records where created_at is before this timestamp. Directly maps to reddit_community_moderation_actions.created_at.
     */
    created_at_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum number of moderation actions to return per page (1-100).
     *
     * @x-autobe-specification Maximum number of records to return in the page. Must be between 1 and 100. Used in conjunction with cursor for pagination.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Opaque cursor token used for pagination. Return from previous response to fetch the next page.
     *
     * @x-autobe-specification Opaque cursor token returned in previous response to fetch the next page. Required for pagination.
     */
    cursor: string;
  };

  /**
   * Summary of a moderation action taken on a post, including the action type, reason provided, timestamp, and the display name of the moderator who performed the action. Designed for efficient display in moderation audit logs and dashboards.
   */
  export type ISummary = {
    /**
     * Type of moderation action performed on the post: 'delete', 'ban', 'approve', or 'dismiss'.
     *
     * @x-autobe-database-schema-property action_type
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.action_type. Enum: 'delete', 'ban', 'approve', 'dismiss'.
     */
    action_type: "delete" | "ban" | "approve" | "dismiss";

    /**
     * The reason provided by the moderator for taking this action. Free text, up to 500 characters.
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.reason. Free text up to 500 characters provided by moderator.
     */
    reason: string;

    /**
     * Timestamp when the moderation action was performed, in ISO 8601 format.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_moderation_actions.created_at. ISO 8601 timestamp set by system.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The public display name of the moderator or administrator who performed this action.
     *
     * @x-autobe-specification Computed: JOIN reddit_community_moderation_actions.actor_id to reddit_community_member_sessions.id, selecting member_display_name from reddit_community_member_sessions. Ensures privacy by exposing display_name instead of internal ID.
     */
    actor_display_name: string;

    /**
     * The unique identifier (UUID) of the post that was moderated.
     *
     * @x-autobe-specification Computed: Access target_id field from reddit_community_moderation_actions when target_type='post'. The target_id field itself is internal and not accessible as a direct column in public schema definition — therefore, the post_id represents the value of target_id when target_type='post', but since it's not declared as a column in the public schema, this must be computed as business logic.
     */
    post_id: string & tags.Format<"uuid">;
  };
}
