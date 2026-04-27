import { tags } from "typia";

import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "./ICommunityPlatformMember";

export namespace ICommunityPlatformCommunitySubscription {
  /**
   * Pagination and sorting criteria for listing community subscribers.
   *
   * Supports standard pagination parameters (page and limit) to control which page of results to retrieve and how many items per page. An optional sort parameter allows sorting subscriber results by subscription recency in ascending or descending order.
   *
   * All parameters are optional — server-side defaults are applied when omitted.
   */
  export type IRequest = {
    /**
     * Page number for paginated results.
     *
     * Specifies which page of subscriber records to retrieve. Page numbering starts from 1, meaning the first page is page 1 (not 0). When omitted, the server defaults to page 1.
     *
     * Combined with the limit parameter to compute the database offset: offset = (page - 1) × limit.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Defaults to 1 server-side when omitted. Applied as SQL OFFSET = (page - 1) * limit in the database query. The backend validates that page >= 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of subscriber records to return per page.
     *
     * Defines the page size for paginated results. Controls how many subscriber records are included in a single response page. The server enforces an upper bound of 100 items per page — requests exceeding this limit are capped.
     *
     * When omitted, a server-side default limit is applied.
     *
     * @x-autobe-specification Maximum items per page. Applied as SQL LIMIT in the database query. Server enforces maximum value of 100 per business rules. Default server-side limit applied when omitted.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sorting direction for subscriber ordering.
     *
     * Controls whether subscribers are sorted by subscription date in ascending or descending order. The sort parameter expects one of two string values:
     *
     * - **asc**: Oldest subscriptions first (ascending by created_at)
     * - **desc**: Newest subscriptions first (descending by created_at)
     *
     * When omitted, a server-side default sorting order is applied, typically newest-first.
     *
     * @x-autobe-specification Sorting direction for the subscription creation date (created_at column). Accepted string values: 'asc' for ascending order (oldest subscriptions first), 'desc' for descending order (newest subscriptions first, applied as default when omitted). Applied as SQL ORDER BY created_at [ASC|DESC] in the database query.
     */
    sort?: string | undefined;
  };

  /**
   * Summary representation of a community subscription record for use in subscriber listing displays.
   *
   * Each summary contains the subscription metadata (unique identifier and creation timestamp) along with the subscribed member and the target community. Designed for compact display when listing subscribers of a particular community, providing enough context to identify who subscribed and to which community.
   */
  export type ISummary = {
    /**
     * The unique identifier of the subscription record.
     *
     * This UUID serves as the primary key for the subscription, uniquely identifying the relationship between a member and a community within the platform.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_community_subscriptions.id. Primary key, UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The timestamp when the subscription was created.
     *
     * Indicates the exact date and time when the member subscribed to the community. Used for chronological sorting of subscribers by recency in subscriber listing views.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_community_subscriptions.created_at. Timestamp with timezone.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The member who subscribed to the community.
     *
     * Contains the subscriber's summary information including their unique identifier, email address, chosen username, registration timestamp, and soft-deletion status.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join from community_platform_community_subscriptions.member_id to community_platform_members.id. Returns ICommunityPlatformMember.ISummary providing id, email, username, created_at, and deleted_at.
     */
    member: ICommunityPlatformMember.ISummary;

    /**
     * The community that the member subscribed to.
     *
     * Contains the community's summary information including its unique identifier, name, description, icon URI, subscriber count, owner details, and creation timestamp. Only active (non-deleted) communities are returned.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification Join from community_platform_community_subscriptions.community_id to community_platform_communities.id. Returns ICommunityPlatformCommunity.ISummary providing id, name, description, icon_uri, subscriber_count, owner, and created_at. Filter: deleted_at IS NULL.
     */
    community: ICommunityPlatformCommunity.ISummary;
  };
}
