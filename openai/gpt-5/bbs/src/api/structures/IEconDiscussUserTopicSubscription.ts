import { tags } from "typia";

import { IEEconDiscussTopicSubscriptionSortBy } from "./IEEconDiscussTopicSubscriptionSortBy";
import { IESortOrder } from "./IESortOrder";

export namespace IEconDiscussUserTopicSubscription {
  /**
   * Search and pagination request for a member’s topic subscriptions.
   *
   * Backed by Topics.econ_discuss_user_topic_subscriptions joined with
   * Topics.econ_discuss_topics. Supports text search across topic metadata,
   * time-range filtering on subscription created_at, and deterministic
   * sorting.
   */
  export type IRequest = {
    /** Page number for pagination (1-based). */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /**
     * Number of records per page.
     *
     * Server enforces maximums to protect performance.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | null
      | undefined;

    /**
     * Keyword for searching Topic metadata
     * (Topics.econ_discuss_topics.name/description). Leverages text indexes
     * noted in Prisma comments.
     */
    q?: string | null | undefined;

    /**
     * Filter by specific topic identifiers (Topics.econ_discuss_topics.id,
     * UUID).
     */
    topicIds?: (string & tags.Format<"uuid">)[] | null | undefined;

    /**
     * Lower bound (inclusive) for subscription creation time window.
     *
     * Maps to Topics.econ_discuss_user_topic_subscriptions.created_at
     * (timestamptz).
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound (inclusive) for subscription creation time window.
     *
     * Maps to Topics.econ_discuss_user_topic_subscriptions.created_at
     * (timestamptz).
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sort field applied to the subscription listing or topic metadata.
     * Typical fields: subscription created_at, topic name, topic code.
     */
    sortBy?: IEEconDiscussTopicSubscriptionSortBy | null | undefined;

    /** Sort ordering (ascending/descending). */
    sortOrder?: IESortOrder | null | undefined;
  };
}
