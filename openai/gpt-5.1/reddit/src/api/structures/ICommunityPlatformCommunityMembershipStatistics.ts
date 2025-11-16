import { tags } from "typia";

export namespace ICommunityPlatformCommunityMembershipStatistics {
  /**
   * Request model for community membership statistics derived from
   * `community_platform_community_memberships` and related community
   * metadata.
   *
   * This DTO allows clients to specify filters, date ranges, and pagination
   * options when requesting aggregated membership statistics across
   * communities. It is used by analytical dashboards and reporting UIs rather
   * than transactional membership flows.
   *
   * Fields are designed to be optional so that callers can start with broad
   * queries (for example, all communities) and progressively narrow down by
   * identifier, visibility, or membership thresholds without needing multiple
   * distinct endpoints.
   */
  export type IRequest = {
    /**
     * Optional list of community identifiers to constrain the statistics
     * query.
     *
     * When provided, only communities whose
     * `community_platform_communities.identifier` matches one of the
     * supplied identifiers are included in the aggregation. This allows
     * dashboards to focus on a curated set of communities instead of the
     * entire platform.
     */
    communityIdentifiers?: string[] | undefined;

    /**
     * Optional lower bound on active member count used to filter
     * communities.
     *
     * When set, only communities whose computed active membership count
     * from `community_platform_community_memberships` meets or exceeds this
     * value are included in the results. This is useful for focusing
     * analysis on medium or large communities.
     */
    minActiveMembers?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional upper bound on active member count used to filter
     * communities.
     *
     * When set, only communities whose computed active membership count is
     * less than or equal to this value are included. This allows dashboards
     * to study small or emerging communities independently from very large
     * ones.
     */
    maxActiveMembers?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional start timestamp delimiting the membership `joined_at` window
     * to include in statistics.
     *
     * When provided, only membership rows in
     * `community_platform_community_memberships` with `joined_at` greater
     * than or equal to this value contribute to the counts. Null indicates
     * no lower time bound.
     */
    joinedFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional end timestamp delimiting the membership `joined_at` window
     * to include in statistics.
     *
     * When provided, only membership rows with `joined_at` less than or
     * equal to this value are counted. Null indicates no upper time bound.
     */
    joinedTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Requested page index for the statistics result set.
     *
     * The value must be a non‑negative integer. Implementations may treat
     * `0` or `1` as the first page depending on platform convention, and
     * they may also apply sensible defaults when the client omits this
     * field entirely.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of statistic entries to return in a single page.
     *
     * The value must be a non‑negative integer. Backends are expected to
     * enforce an upper bound to prevent excessively large responses and may
     * clamp very large values down to a configured maximum.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Field name used to sort the statistics results, such as
     * `totalActiveMembers` or `communityIdentifier`.
     *
     * The implementation should restrict this to a whitelist of allowed
     * sort fields so that callers cannot request unsupported orderings.
     * Invalid values should either be rejected or replaced with a
     * documented default order.
     */
    orderBy?: string | undefined;

    /**
     * Sort direction for the statistics results.
     *
     * The value must be either `asc` for ascending order or `desc` for
     * descending order. When omitted, the implementation should choose a
     * sensible default, such as descending by total active members. Any
     * value outside this enumeration is considered invalid by the schema.
     */
    orderDirection?: "asc" | "desc" | undefined;
  };

  /**
   * Summary statistics about memberships for a given community, optimized for
   * display in community headers, search results, and recommendation units.
   *
   * All values are derived from aggregating rows in the
   * `community_platform_community_memberships` Prisma model together with
   * related community metadata. The aggregation typically considers only
   * active memberships (for example, `is_active = true`, `ended_at` is null,
   * and `deleted_at` is null) so that the snapshot reflects the current state
   * of the community rather than its full historical record.
   *
   * This DTO is intentionally not a 1:1 mapping of the
   * `community_platform_community_memberships` table. Instead, it exposes a
   * small set of non‑negative counters and activity indicators that describe
   * the size and recent behaviour of the community without exposing
   * per‑membership details.
   */
  export type ISummary = {
    /**
     * Identifier of the community whose membership statistics are being
     * summarized.
     *
     * This value corresponds to the `id` column of the
     * `community_platform_communities` Prisma model. All counts in this
     * summary are computed by aggregating membership rows from
     * `community_platform_community_memberships` that belong to this
     * community.
     */
    community_id: string & tags.Format<"uuid">;

    /**
     * Total number of active member users currently joined to this
     * community.
     *
     * This count is typically computed over
     * `community_platform_community_memberships` by including only rows
     * that represent active memberships (for example, `is_active = true`,
     * `ended_at` is null, and `deleted_at` is null). It provides the
     * primary headline membership size used in community headers and
     * discovery experiences.
     */
    total_members_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Approximate number of members who are considered online or recently
     * active in this community.
     *
     * This value is derived from recent activity signals associated with
     * membership and content interactions, rather than being a direct
     * column on `community_platform_community_memberships`. It is intended
     * for quick indicators like "X users online" and may be omitted or
     * stale when real‑time computation is disabled or delayed.
     */
    online_members_estimate?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Number of new members who joined this community within the last 24
     * hours.
     *
     * This metric is typically computed by counting membership rows in
     * `community_platform_community_memberships` whose `joined_at`
     * timestamp falls within a rolling 24‑hour window. It may be omitted
     * when the calling analytics context does not require daily
     * granularity.
     */
    daily_new_members_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Number of new members who joined this community within the last 7
     * days.
     *
     * The value is usually derived from the same
     * `community_platform_community_memberships.joined_at` column as the
     * daily metric, but aggregated over a rolling 7‑day window. It helps
     * surface medium‑term growth trends without requiring full time‑series
     * data.
     */
    weekly_new_members_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Number of new members who joined this community within the last 30
     * days.
     *
     * This counter aggregates membership rows from
     * `community_platform_community_memberships` whose `joined_at` falls
     * within a rolling 30‑day window. It is particularly useful for
     * high‑level growth summaries in dashboards and search result cards,
     * and may be omitted in contexts where only total membership matters.
     */
    monthly_new_members_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;
  };
}
