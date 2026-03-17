import { tags } from "typia";

import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallSellerSession {
  /**
   * Summary representation of an authenticated seller session, including the session identifier, connection context, validity timestamps, and the associated seller account summary for audit and session browsing responses.
   */
  export type ISummary = {
    /**
     * Unique identifier of the seller session record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Seller account that owns this authenticated session.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join shopping_mall_seller_sessions.shopping_mall_seller_id to shopping_mall_sellers.id and serialize the related seller as IShoppingMallSeller.ISummary.
     */
    seller: IShoppingMallSeller.ISummary;

    /**
     * IP address from which the seller session was established.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.ip.
     */
    ip: string;

    /**
     * Originating client URL captured when the seller session was created.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.href.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL captured at the time the seller session was established.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.referrer.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Timestamp when the seller session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the seller session expires and becomes invalid for authentication.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.expired_at.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request body for filtering, sorting, and paginating seller session records in administrative session oversight screens. It lets API consumers narrow results by session identity, seller identity, connection metadata, creation and expiration windows, and expiration status while also controlling page size and ordering. All properties are optional so callers can browse broadly or perform targeted investigations.
   */
  export type IRequest = {
    /**
     * Specific seller session identifier to search for.
     *
     * @x-autobe-specification Optional equality filter targeting shopping_mall_seller_sessions.id. When provided, return only the seller session whose primary key exactly matches this UUID, combined with any other supplied filters using logical AND.
     */
    sessionId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Seller account identifier used to limit results to one seller's sessions.
     *
     * @x-autobe-specification Optional equality filter targeting shopping_mall_seller_sessions.shopping_mall_seller_id. Use this seller account UUID to restrict results to sessions owned by one seller.
     */
    sellerId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * IP address captured for the session.
     *
     * @x-autobe-specification Optional equality filter targeting shopping_mall_seller_sessions.ip. Apply the provided IPv4 value to match the IP address captured when the session was created.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Originating client URL associated with the session.
     *
     * @x-autobe-specification Optional equality filter targeting shopping_mall_seller_sessions.href. Use the provided URI to match the originating client URL recorded for the seller session.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Referrer URL captured for the session.
     *
     * @x-autobe-specification Optional equality filter targeting shopping_mall_seller_sessions.referrer. Use the provided URI to match the referrer recorded when the seller session was established.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;

    /**
     * Start of the session creation time range filter.
     *
     * @x-autobe-specification Optional inclusive lower-bound filter applied to shopping_mall_seller_sessions.created_at. Include only session rows whose creation timestamp is greater than or equal to this datetime.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the session creation time range filter.
     *
     * @x-autobe-specification Optional inclusive upper-bound filter applied to shopping_mall_seller_sessions.created_at. Include only session rows whose creation timestamp is less than or equal to this datetime.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Start of the session expiration time range filter.
     *
     * @x-autobe-specification Optional inclusive lower-bound filter applied to shopping_mall_seller_sessions.expired_at. Include only session rows whose expiration timestamp is greater than or equal to this datetime.
     */
    expiredAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the session expiration time range filter.
     *
     * @x-autobe-specification Optional inclusive upper-bound filter applied to shopping_mall_seller_sessions.expired_at. Include only session rows whose expiration timestamp is less than or equal to this datetime.
     */
    expiredAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Whether to restrict results by expiration status.
     *
     * @x-autobe-specification Optional computed filter derived by comparing shopping_mall_seller_sessions.expired_at with the current server timestamp at query execution. When true, return only expired sessions; when false, return only currently valid sessions.
     */
    isExpired?: boolean | undefined;

    /**
     * Page number of the result set to retrieve.
     *
     * @x-autobe-specification Optional 1-based page number used to calculate the offset for paginated query execution. When omitted, use the service default first-page behavior.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of session records to include in one page.
     *
     * @x-autobe-specification Optional maximum number of results to return in one page. Enforce the declared minimum and maximum bounds and use this value when computing pagination metadata.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field used to order the session results.
     *
     * @x-autobe-specification Optional sort selector for the seller-session query. Map createdAt to shopping_mall_seller_sessions.created_at, expiredAt to shopping_mall_seller_sessions.expired_at, ip to shopping_mall_seller_sessions.ip, and referrer to shopping_mall_seller_sessions.referrer. Reject any unsupported value.
     */
    sortBy?: "createdAt" | "expiredAt" | "ip" | "referrer" | undefined;

    /**
     * Direction used to sort the session results.
     *
     * @x-autobe-specification Optional ordering direction applied to the field selected by sortBy. Use ascending order for asc and descending order for desc; if omitted, apply the endpoint default ordering.
     */
    sortDirection?: "asc" | "desc" | undefined;
  };
}
