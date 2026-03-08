import { tags } from "typia";

import { IRedditPlatformAdmin } from "./IRedditPlatformAdmin";

export namespace IRedditPlatformWebhookEndpoint {
  /**
   * Summary representation of a webhook endpoint configuration used in list responses. Contains essential identification and status information for webhook endpoints, excluding sensitive security credentials. Used in paginated admin webhooks listings and webhook management dashboards.
   */
  export type ISummary = {
    /**
     * Unique identifier for the webhook endpoint configuration.
     *
     * @x-autobe-specification Computed/external ID from webhook configuration layer. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Human-readable name for the webhook endpoint.
     *
     * @x-autobe-specification String identifier for webhook endpoint. Required field from webhook configuration.
     */
    name: string;

    /**
     * Optional description of the webhook endpoint's purpose.
     *
     * @x-autobe-specification Optional string description for webhook endpoint purpose.
     */
    description?: string | undefined;

    /**
     * URL endpoint where webhook events are sent.
     *
     * @x-autobe-specification URI endpoint where webhook events are delivered. Valid RFC 3986 URI format. Required field from webhook configuration.
     */
    url: string & tags.Format<"uri">;

    /**
     * List of event types this webhook endpoint subscribes to.
     *
     * @x-autobe-specification Array of event types subscribed to (min 1). Event type values defined in integration contracts layer. e.g., 'post.created', 'comment.voted', etc.
     */
    eventTypes: string[] & tags.MinItems<1>;

    /**
     * Current status of the webhook endpoint.
     *
     * @x-autobe-specification Endpoint status: active (delivering), inactive (disabled), paused (temporarily stopped), failed (last delivery failed). Managed by webhook delivery system.
     */
    status: "active" | "inactive" | "paused" | "failed";

    /**
     * Total number of delivery attempts for this webhook endpoint.
     *
     * @x-autobe-specification Computed count of total delivery attempts. Initialized to 0 when webhook is created. Incremented on each delivery attempt.
     */
    deliveryCount?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Timestamp of the last delivery attempt, null if no deliveries yet.
     *
     * @x-autobe-specification Timestamp of last delivery attempt. Nullable if no deliveries have occurred.
     */
    lastAttemptAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Creation timestamp of the webhook endpoint.
     *
     * @x-autobe-specification Timestamp when webhook endpoint was created. Managed by webhook configuration layer. ISO 8601 datetime format.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Last update timestamp of the webhook endpoint.
     *
     * @x-autobe-specification Timestamp when webhook configuration was last updated. Set by webhook configuration layer on each update. ISO 8601 datetime format.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Administrator who created this webhook endpoint.
     *
     * @x-autobe-specification Reference to IRedditPlatformAdmin.ISummary containing id and username of admin who created webhook. Join with admin table for admin context.
     */
    createdByAdmin: IRedditPlatformAdmin.ISummary;
  };

  /**
   * Query parameters for filtering, sorting, and paginating webhook endpoint configurations. Used by administrators to monitor webhook health and manage endpoint configurations across the platform.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1.
     *
     * @x-autobe-specification Page number for cursor-based pagination (1-indexed). Defaults to 1. Used to calculate offset for result set pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page, maximum 100.
     *
     * @x-autobe-specification Number of items per page, minimum 1, maximum 100. Defaults to 20. Controls page size for pagination results.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter webhook endpoints by subscribed event type.
     *
     * @x-autobe-specification Filter webhook endpoints by subscribed event category. Valid values: post_created, comment_submitted, community_action, user_action, moderation_action. Optional filter for event-based webhook selection.
     */
    event_type?:
      | "post_created"
      | "comment_submitted"
      | "community_action"
      | "user_action"
      | "moderation_action"
      | undefined;

    /**
     * Filter webhook endpoints by delivery status.
     *
     * @x-autobe-specification Filter webhook endpoints by delivery status. Valid values: active, inactive, paused, failed. Optional filter for status-based webhook selection.
     */
    status?: "active" | "inactive" | "paused" | "failed" | undefined;

    /**
     * Field to sort results by.
     *
     * @x-autobe-specification Field to sort results by. Valid values: created_at, last_attempt_at, delivery_count. Optional parameter, defaults to created_at.
     */
    sort_field?:
      | "created_at"
      | "last_attempt_at"
      | "delivery_count"
      | undefined;

    /**
     * Sort order direction.
     *
     * @x-autobe-specification Sort order direction. Valid values: asc (ascending), desc (descending). Defaults to desc for created_at sorting.
     */
    sort_order?: "asc" | "desc" | undefined;
  };
}
