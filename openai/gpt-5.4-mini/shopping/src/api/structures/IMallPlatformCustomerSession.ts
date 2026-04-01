import { tags } from "typia";

import { IMallPlatformCustomer } from "./IMallPlatformCustomer";

export namespace IMallPlatformCustomerSession {
  /**
   * Lightweight customer session summary for browsing and pagination. It shows the session identity, client context, expiration information, and the related customer summary.
   */
  export type ISummary = {
    /**
     * Unique identifier for the customer session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from mall_platform_customer_sessions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Customer account associated with this session.
     *
     * @x-autobe-database-schema-property customer
     * @x-autobe-specification Resolve the belongs-to relation from mall_platform_customer_sessions.customer via mall_platform_customer_id and expose it as IMallPlatformCustomer.ISummary.
     */
    customer: IMallPlatformCustomer.ISummary;

    /**
     * IP address observed when the session was created.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from mall_platform_customer_sessions.ip.
     */
    ip: string;

    /**
     * Request URL or entry page recorded for this session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from mall_platform_customer_sessions.href.
     */
    href: string;

    /**
     * Referrer URL recorded when the session was created.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from mall_platform_customer_sessions.referrer.
     */
    referrer: string;

    /**
     * Timestamp when the session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from mall_platform_customer_sessions.created_at to the camelCase API field createdAt.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires and becomes invalid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from mall_platform_customer_sessions.expired_at to the camelCase API field expiredAt.
     */
    expiredAt: string & tags.Format<"date-time">;
  };

  /**
   * Search, filter, sort, and paginate customer session records for security and account-inspection workflows.
   */
  export type IRequest = {
    /**
     * Filter sessions by the owning customer account identifier.
     *
     * @x-autobe-database-schema-property mall_platform_customer_id
     * @x-autobe-specification Direct filter mapping to mall_platform_customer_sessions.mall_platform_customer_id. Use only when authorization permits broader inspection; otherwise scope implicitly to the authenticated customer.
     */
    mallPlatformCustomerId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter sessions by the IP address recorded at session creation.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct filter mapping to mall_platform_customer_sessions.ip.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter sessions by the request URL or entry page recorded for the session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct filter mapping to mall_platform_customer_sessions.href.
     */
    href?: (string & tags.Format<"uri-reference">) | undefined;

    /**
     * Filter sessions by the referrer URL recorded when the session was created.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct filter mapping to mall_platform_customer_sessions.referrer.
     */
    referrer?: (string & tags.Format<"uri-reference">) | undefined;

    /**
     * Return sessions created on or after this timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Apply a lower-bound range filter on mall_platform_customer_sessions.created_at.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Return sessions created on or before this timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Apply an upper-bound range filter on mall_platform_customer_sessions.created_at.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Return sessions expiring on or after this timestamp.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Apply a lower-bound range filter on mall_platform_customer_sessions.expired_at.
     */
    expiredAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Return sessions expiring on or before this timestamp.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Apply an upper-bound range filter on mall_platform_customer_sessions.expired_at.
     */
    expiredAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sorting criteria for the session list.
     *
     * @x-autobe-specification Interpret as the requested ordering for the session query. Validate against allowed sort keys and apply stable ordering for pagination; this value is not persisted.
     */
    sort?: string | undefined;

    /**
     * Page number to retrieve.
     *
     * @x-autobe-specification Use as the 1-indexed page number for paginated session results. This value is validated and translated into query offset/limit logic only.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of sessions to return per page.
     *
     * @x-autobe-specification Use as the maximum number of session records returned per page. This value is validated and translated into query limit logic only.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
