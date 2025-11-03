import { tags } from "typia";

import { ICommunityBbsCommunity } from "./ICommunityBbsCommunity";

export namespace ICommunityBbsMvCommunityBbsDailyStat {
  /**
   * Summary view for the materialized daily analytics for a community. Maps
   * to the materialized view/model mv_community_bbs_daily_stats and provides
   * denormalized metrics intended for dashboards and list displays.
   */
  export type ISummary = {
    /** Unique identifier of the materialized daily stat record. */
    id: string & tags.Format<"uuid">;

    /**
     * Summary information for the community this daily stat belongs to. Use
     * this object to access community id, name and lightweight metrics.
     */
    community: ICommunityBbsCommunity.ISummary;

    /**
     * Calendar day represented as an ISO 8601 date (YYYY-MM-DD) for the
     * aggregated day in UTC. NOTE: the underlying materialized view stores
     * a timestamp (timestamptz); the API normalizes that timestamp to a
     * calendar date in UTC for client consumption. Example: "2025-10-31".
     */
    day: string & tags.Format<"date">;

    /** Number of posts published in the community on the given day. */
    posts_count: number & tags.Type<"int32">;

    /** Number of comments created in the community on the given day. */
    comments_count: number & tags.Type<"int32">;

    /** Number of new community members (joins) during the day. */
    new_members: number & tags.Type<"int32">;

    /** Count of distinct active users in the community during the day. */
    active_users: number & tags.Type<"int32">;

    /**
     * Average post score for posts created that day; null when not
     * applicable.
     */
    avg_post_score?: number | null | undefined;

    /** Timestamp when this materialized row was created. */
    created_at: string & tags.Format<"date-time">;
  };
}
