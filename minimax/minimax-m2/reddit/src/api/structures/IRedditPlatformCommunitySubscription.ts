import { tags } from "typia";

import { IRedditPlatformCommunity } from "./IRedditPlatformCommunity";

export namespace IRedditPlatformCommunitySubscription {
  /**
   * Request for updating user subscription preferences to control community
   * content visibility and notifications.
   *
   * Allows users to customize how community content appears in their
   * personalized feed and manage notification settings. Supports subscription
   * level adjustment, notification preferences, and feed weighting for
   * optimal content discovery.
   *
   * Users control their content consumption experience while maintaining
   * community participation through flexible subscription management.
   */
  export type IRequest = {
    /**
     * Content visibility level: 'full' (all posts), 'digest' (summaries),
     * 'mute' (hidden)
     */
    subscription_level: "full" | "digest" | "mute";

    /** Enable/disable notifications for new community posts */
    notification_enabled: boolean;

    /** Relative content weight in personalized feed (0.1-2.0 range) */
    feed_weight: number &
      tags.Minimum<0.1> &
      tags.Maximum<2> &
      tags.MultipleOf<0.1>;
  };

  /**
   * Response DTO for community subscription details showing current
   * subscription status and preferences.
   *
   * Provides comprehensive subscription information including community
   * context, user preferences, and activity metrics. This summary is used for
   * displaying subscription status in user dashboards and community
   * management interfaces.
   *
   * Includes community identification and metadata, current subscription
   * preferences, and activity timestamps for tracking user engagement with
   * community content. The subscription data enables personalized feed
   * generation and community participation analytics.
   *
   * Security: Excludes sensitive authentication information and
   * system-internal tracking data. Community information is provided without
   * exposing internal system identifiers.
   */
  export type ISummary = {
    /** Unique identifier for this subscription relationship record */
    id: string & tags.Format<"uuid">;

    /**
     * Current subscription level: 'full' (all content), 'digest' (periodic
     * summaries), or 'mute' (hidden from feed)
     */
    subscription_level: string;

    /** Whether notifications are enabled for new posts in this community */
    notification_enabled: boolean;

    /**
     * Current relative weight of this community's content in user's feed
     * (0.1-2.0 range)
     */
    feed_weight: number &
      tags.Minimum<0.1> &
      tags.Maximum<2> &
      tags.MultipleOf<0.1>;

    /** Timestamp when user first subscribed to the community */
    subscribed_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of user's most recent interaction with content from this
     * community
     */
    last_activity_at?: (string & tags.Format<"date-time">) | undefined;

    /** Community name for display purposes */
    community_name: string;

    /** Community title for display purposes */
    community_title: string;
  };

  /**
   * Subscription details from user's perspective with complete community
   * context.
   *
   * Used when displaying subscription information from the user's viewpoint,
   * providing comprehensive context about both the subscription relationship
   * and the community they're subscribed to. This format is particularly
   * useful for user profile views, subscription management interfaces, and
   * personalized feed configuration.
   *
   * The response includes the complete subscription junction record tracking
   * the relationship between user and community, enhanced with full community
   * information for context. This enables users to see subscription
   * preferences alongside community details like name, description, and
   * member counts.
   *
   * Key details include subscription level, notification preferences, feed
   * weighting, subscription timestamp, and community information for complete
   * subscription management. The community context helps users understand
   * what they're subscribed to and make informed decisions about their
   * subscription preferences.
   *
   * Security: Users can only view their own subscription details. The
   * community summary includes essential information without revealing
   * sensitive community settings or internal details.
   */
  export type IInvert = {
    /** Primary Key. */
    id: string & tags.Format<"uuid">;

    /**
     * Subscription level: 'full' (all content), 'digest' (periodic
     * summaries), 'mute' (hidden from feed).
     */
    subscription_level: "full" | "digest" | "mute";

    /** Whether user receives notifications for new posts in this community. */
    notification_enabled: boolean;

    /**
     * Relative weight of this community's content in user's feed (0.1-2.0
     * range).
     */
    feed_weight: number & tags.Minimum<0.1> & tags.Maximum<2>;

    /** Timestamp when user subscribed to the community. */
    subscribed_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of user's most recent interaction with content from this
     * community (null if no recent activity).
     */
    last_activity_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Complete community information providing full context about the
     * subscribed community including name, description, type, and current
     * stats.
     */
    community: IRedditPlatformCommunity.ISummary;
  };
}
