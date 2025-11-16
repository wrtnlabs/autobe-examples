import { tags } from "typia";

export namespace ICommunityPlatformCommunityBanStatistics {
  /**
   * Request parameters for retrieving analytical statistics about
   * community-level bans from `community_platform_community_bans`.
   *
   * This DTO is used by platform administrators to filter and group ban data
   * for reporting and monitoring moderation health across communities. It
   * never creates or updates bans; it only drives read-only aggregations and
   * grouped counts.
   */
  export type IRequest = {
    /**
     * Optional list of community IDs to restrict ban statistics to specific
     * communities. If omitted, bans from all communities are considered
     * subject to other filters.
     */
    community_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of community codes or slugs used to filter target
     * communities for ban statistics. This is an alternative to
     * `community_ids`.
     */
    community_codes?: string[] | undefined;

    /**
     * Optional list of member user IDs to focus statistics on bans applied
     * to specific users. This is primarily useful for investigative and
     * audit purposes.
     */
    banned_member_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of reason category identifiers, typically referencing
     * `community_platform_report_reason_categories` or
     * `community_platform_content_policy_categories`, used to filter bans
     * by underlying reason classifications.
     */
    reason_category_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional filter for ban status values. When provided, only bans whose
     * status matches one of the supplied codes are considered in the
     * statistics.
     */
    statuses?: string[] | undefined;

    /**
     * Optional filter indicating which actor types should be considered as
     * issuers of bans. This is useful when comparing moderator-driven
     * enforcement with platform-level interventions.
     */
    issued_by_actor_types?:
      | ("communityModerator" | "platformAdmin")[]
      | undefined;

    /**
     * Lower bound (inclusive) for the creation timestamp of bans to be
     * included in the analysis. Bans created before this timestamp are
     * excluded.
     */
    from_created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper bound (exclusive) for the creation timestamp of bans. Bans
     * created at or after this timestamp are excluded.
     */
    to_created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Lower bound (inclusive) for the effective start timestamp of bans
     * (when the ban actually took effect).
     */
    from_effective_at?: (string & tags.Format<"date-time">) | undefined;

    /** Upper bound (exclusive) for the effective start timestamp of bans. */
    to_effective_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * List of dimensions for grouping ban statistics. Multiple group-by
     * dimensions may be combined to produce multi-dimensional aggregations,
     * subject to implementation limits.
     */
    group_by?:
      | (
          | "community"
          | "reasonCategory"
          | "status"
          | "issuedByActorType"
          | "createdAt"
          | "effectiveAt"
        )[]
      | undefined;

    /** Page number for paginating ban statistics summaries. Starts from 1. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of ban statistic summaries to return per page. Server
     * may enforce an upper bound such as 200 to protect performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>)
      | undefined;
  };

  /**
   * Summary view of community ban statistics, capturing high-level moderation
   * outcomes related to community-level bans over a specific time window.
   * Used for moderation dashboards, reporting, and safety monitoring rather
   * than raw event logs.
   */
  export type ISummary = {
    /**
     * Unique identifier of the community whose ban statistics are being
     * summarized.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Human-readable label describing the aggregation window for these ban
     * metrics (for example, '24h', '7d', '30d', or 'all_time').
     */
    timeWindow: string;

    /**
     * Start timestamp (inclusive) of the period over which ban-related
     * statistics were aggregated, in ISO 8601 date-time format.
     */
    startAt: string & tags.Format<"date-time">;

    /**
     * End timestamp (exclusive) of the period over which ban-related
     * statistics were aggregated, in ISO 8601 date-time format.
     */
    endAt: string & tags.Format<"date-time">;

    /**
     * Total number of community-level bans that became active during the
     * aggregation period, including both temporary and permanent bans.
     */
    totalBans: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of community-level bans created during the aggregation period
     * that have a defined expiration time.
     */
    temporaryBans: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of community-level bans created during the aggregation period
     * that do not have an expiration time and are considered permanent
     * until explicitly lifted.
     */
    permanentBans: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of bans that were lifted, expired, or otherwise no longer
     * active during the aggregation period.
     */
    liftedBans: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of distinct member users who remained actively banned from the
     * community at the end of the aggregation period.
     */
    activeBannedMembers: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
