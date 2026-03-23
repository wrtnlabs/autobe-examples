import { tags } from "typia";

import { IRedditLikeCommunity } from "./IRedditLikeCommunity";

export namespace IRedditLikeSubscription {
  /**
   * Lightweight subscription summary for list views and feeds.
   */
  export type ISummary = {
    /**
     * Unique subscription identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_like_subscriptions.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Subscription status indicating current state.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from reddit_like_subscriptions.status. Value is 'subscribed' or 'unsubscribed'.
     */
    status: string;

    /**
     * The community that the user is subscribed to.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification Join from reddit_like_subscriptions.reddit_like_community_id to reddit_like_communities.id. Returns ICommunity.ISummary.
     */
    community: IRedditLikeCommunity.ISummary;

    /**
     * Timestamp when the subscription was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_like_subscriptions.created_at. Timestamp when subscription was created.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for filtering and paginating subscription lists. Supports status filtering, community name search, sorting by creation date, and pagination.
   */
  export type IRequest = {
    /**
     * Subscription status filter. When provided, only returns subscriptions with this status. Can be 'subscribed' or 'unsubscribed'.
     *
     * @x-autobe-specification Optional status filter. When provided, only returns subscriptions with this status. Valid values are 'subscribed' or 'unsubscribed'.
     */
    status?: "subscribed" | "unsubscribed" | undefined;

    /**
     * Search by community name. Performs partial match search on community.name field.
     *
     * @x-autobe-specification Optional search by community name. Performs partial match (LIKE) search on community.name field.
     */
    communityName?: string | undefined;

    /**
     * Sort order for results. 'asc' for oldest first, 'desc' for newest first. Defaults to 'desc'.
     *
     * @x-autobe-specification Optional sort order for results. 'asc' for oldest first, 'desc' for newest first. Defaults to 'desc'.
     */
    sort?: "asc" | "desc" | undefined;

    /**
     * Number of records to skip for pagination. Defaults to 0.
     *
     * @x-autobe-specification Number of records to skip for pagination. Defaults to 0. Maximum value is unlimited but practical usage stays under typical offset limits.
     */
    offset?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return. Defaults to 20, maximum 100.
     *
     * @x-autobe-specification Maximum number of records to return. Defaults to 20, maximum 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * @x-autobe-specification Target page number to retrieve (1-indexed). Defaults to 1 if not provided. If null or omitted, defaults to page 1. Requesting beyond available range returns empty data with valid pagination metadata reflecting actual totals.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
