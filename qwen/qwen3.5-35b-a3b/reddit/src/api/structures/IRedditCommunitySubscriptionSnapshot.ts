import { tags } from "typia";

export namespace IRedditCommunitySubscriptionSnapshot {
  /**
   * Point-in-time snapshot of a subscription record for audit trail and historical tracking.
   *
   * Contains the essential fields captured at the moment a snapshot was created: the unique identifier, the timestamp when the snapshot was taken, and the original subscription's lifecycle timestamps (created_at, updated_at, deleted_at) at that point in time.
   */
  export type ISummary = {
    /**
     * Unique identifier for the snapshot record.
     *
     * A UUID that uniquely identifies this historical snapshot within the audit trail.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_community_subscriptions_snapshots.id. UUID primary key for
         *   the snapshot record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this snapshot was captured.
     *
     * Indicates the exact point in time when the snapshot was taken, allowing users to understand the temporal context of the historical record.
     *
         * @x-autobe-database-schema-property snapshot_created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_community_subscriptions_snapshots.snapshot_created_at.
         *   Timestamp when this snapshot was created.
     */
    snapshot_created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the original subscription was created.
     *
     * This value represents the subscription creation time at the moment the snapshot was captured, preserving the historical record.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_community_subscriptions_snapshots.created_at. Timestamp when
         *   the original subscription was created, captured at snapshot time.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the original subscription was last updated.
     *
     * This value reflects the subscription's last modification time as of when the snapshot was captured, providing historical accuracy.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   reddit_community_subscriptions_snapshots.updated_at. Timestamp when
         *   the original subscription was last updated, captured at snapshot
         *   time.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the original subscription was soft deleted, if applicable.
     *
     * May be null if the subscription was not deleted at the time the snapshot was captured. Represents the soft deletion state of the subscription at that point in time.
     *
         * @x-autobe-database-schema-property deleted_at
         * @x-autobe-specification Direct mapping from
         *   reddit_community_subscriptions_snapshots.deleted_at. Nullable
         *   timestamp when the original subscription was soft deleted, captured
         *   at snapshot time. Null if subscription was not deleted at snapshot
         *   time.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
