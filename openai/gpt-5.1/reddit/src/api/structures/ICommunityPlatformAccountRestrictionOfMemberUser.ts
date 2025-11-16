import { tags } from "typia";

import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace ICommunityPlatformAccountRestrictionOfMemberUser {
  /**
   * Summary view of the linkage between a restriction episode and a member
   * user account.
   *
   * This type represents a lightweight projection of a row in
   * `community_platform_account_restrictions_of_memberusers`, which connects
   * a generic restriction record to a concrete member user in
   * `community_platform_memberusers`.
   *
   * It is used inside restriction DTOs to provide quick insight into which
   * member user is affected without expanding full user profile details.
   */
  export type ISummary = {
    /**
     * Primary key of the member‑user restriction linkage record.
     *
     * This value corresponds to
     * `community_platform_account_restrictions_of_memberusers.id` and
     * uniquely identifies the linkage row.
     *
     * It is primarily used for internal referencing and debugging rather
     * than as a public identifier in business flows.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the restriction episode associated with this member
     * user.
     *
     * This field maps to
     * `community_platform_account_restrictions_of_memberusers.community_platform_account_restriction_id`
     * and references `community_platform_account_restrictions.id`.
     *
     * It is unique per linkage table row, ensuring that each restriction
     * episode is linked at most once to a given member user in this table.
     */
    community_platform_account_restriction_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the member user account that this restriction episode
     * applies to.
     *
     * This column is
     * `community_platform_account_restrictions_of_memberusers.community_platform_memberuser_id`
     * and references `community_platform_memberusers.id`.
     *
     * Moderation and support tools can use this value to join into richer
     * member‑user profile data when needed.
     */
    community_platform_memberuser_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this member‑user restriction linkage was created.
     *
     * This field mirrors
     * `community_platform_account_restrictions_of_memberusers.created_at`
     * and captures when the restriction became associated with the member
     * user.
     *
     * It is useful for reconstructing enforcement timelines and
     * understanding when restrictions were first applied.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this linkage record was last updated.
     *
     * The column
     * `community_platform_account_restrictions_of_memberusers.updated_at`
     * is refreshed when linkage metadata changes, such as during
     * synchronization with account‑level status flags.
     *
     * Tools can use this value to detect recent changes in restriction
     * associations for a member user.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp for the linkage between the restriction
     * episode and the member user.
     *
     * This value comes from
     * `community_platform_account_restrictions_of_memberusers.deleted_at`
     * and indicates that the linkage is no longer considered active, even
     * if the underlying restriction record persists.
     *
     * Historical analytics and audit views can still include soft‑deleted
     * linkages to preserve a full picture of past enforcement actions.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Summary of the member user account affected by this restriction
     * linkage.
     *
     * This association is resolved from `community_platform_memberuser_id`
     * and exposes a compact `ICommunityPlatformMemberUser.ISummary` so that
     * UIs embedding restriction information can display the impacted member
     * without issuing additional queries.
     *
     * The summary keeps the linkage DTO lightweight while still providing
     * enough identity context for moderation workflows.
     */
    memberUser?: ICommunityPlatformMemberuser.ISummary | null | undefined;
  };
}
