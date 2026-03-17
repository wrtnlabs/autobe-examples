import { tags } from "typia";

import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";

export namespace IRedditCommunitySubscription {
  /**
   * Lightweight subscription summary for list display. Shows the subscription identifier, creation timestamp, and the community being subscribed to.
   */
  export type ISummary = {
    /**
     * Unique subscription identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_subscriptions.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The community this subscription links to.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification Association via JOIN from reddit_community_subscriptions to reddit_community_communities. Returns .ISummary with community fields (id, name, description, subscriber_count).
     */
    community: IRedditCommunityCommunity.ISummary;

    /**
     * When this subscription was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_subscriptions.created_at. Timestamp when the subscription was created.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for filtering, sorting, and paginating a member's subscription list.
   */
  export type IRequest = {
    /**
     * Field to sort subscription results by.
     *
     * @x-autobe-specification Sorting field for subscription list. Options: 'created_at' (subscription creation date), 'community_name' (name of the community). Used with sortDirection to control sort order.
     */
    sortBy?: "created_at" | "community_name" | undefined;

    /**
     * Sort order direction for results.
     *
     * @x-autobe-specification Sort direction: 'ASC' for ascending (earliest first, A-Z), 'DESC' for descending (latest first, Z-A). Used in conjunction with sortBy parameter.
     */
    sortDirection?: "ASC" | "DESC" | undefined;

    /**
     * Minimum subscription creation date (inclusive).
     *
     * @x-autobe-specification Minimum creation date filter (inclusive). Filters subscriptions where created_at >= this value. ISO 8601 datetime string format (e.g., '2024-01-01T00:00:00Z').
     */
    minCreatedAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum subscription creation date (inclusive).
     *
     * @x-autobe-specification Maximum creation date filter (inclusive). Filters subscriptions where created_at <= this value. ISO 8601 datetime string format (e.g., '2024-12-31T23:59:59Z').
     */
    maxCreatedAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by exact community name match.
     *
     * @x-autobe-specification Exact match filter on community name. Filters subscriptions where community.name equals this value exactly. Case-sensitive string matching.
     */
    communityName?: string | undefined;

    /**
     * Page number for pagination (1-indexed).
     *
     * @x-autobe-specification Current page number (1-based). Page 1 returns the first page of results. Defaults to 1 if not provided or invalid. Used with pageSize for pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page (1-100).
     *
     * @x-autobe-specification Number of records per page. Minimum: 1, Maximum: 100. Default: 20 if not provided. Controls how many subscription records are returned in each page.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * @x-autobe-specification Maximum total records to return across all pages. If null or omitted, defaults to 100. Server enforces this upper bound to prevent excessive resource usage. Overrides pageSize total record count.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
