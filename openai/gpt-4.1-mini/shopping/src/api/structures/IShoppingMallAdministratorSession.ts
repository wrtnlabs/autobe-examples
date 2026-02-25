import { tags } from "typia";

import { IShoppingMallAdministrator } from "./IShoppingMallAdministrator";

export namespace IShoppingMallAdministratorSession {
  /**
   * Summary representation of an administrator session record showing session metadata and linked administrator information for use in listing and session management scenarios.
   */
  export type ISummary = {
    /**
     * Unique identifier of this administrator session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_administrator_sessions.id column, unique identifier of the session record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The administrator linked to this session.
     *
     * @x-autobe-database-schema-property administrator
     * @x-autobe-specification Mapped from shopping_mall_administrator_sessions.administrator_id FK relation joined to shopping_mall_administrators.id with representation as IShoppingMallAdministrator.ISummary interface.
     */
    administrator: IShoppingMallAdministrator.ISummary;

    /**
     * Client IP address for the session.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_administrator_sessions.ip column, represents the IP address where the session originated.
     */
    ip: string;

    /**
     * URL where this session was initiated or last accessed.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_administrator_sessions.href column, representing the URL where the session was initiated or last accessed.
     */
    href: string;

    /**
     * HTTP referrer header for the session request.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_administrator_sessions.referrer column, representing the HTTP referrer header of the session request.
     */
    referrer: string;

    /**
     * Timestamp when this session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_administrator_sessions.created_at column, timestamp indicating when the session was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session will expire.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_administrator_sessions.expired_at column, timestamp when the session expires and is no longer valid.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request schema for filtering and paginating administrator session records used by administrator users to securely manage authentication sessions.
   */
  export type IRequest = {
    /**
     * UUID of the administrator associated with the session for filter criteria.
     *
     * @x-autobe-database-schema-property administrator_id
     * @x-autobe-specification Maps to administrator_id column for filtering sessions by administrator UUID.
     */
    administratorId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter substring for the IP address where the session was created.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping to ip column, used to filter sessions by IP address substring.
     */
    ip?: string | undefined;

    /**
     * Filter substring for the URL where the session was initiated or last accessed.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping to href column, used for filtering sessions by originating URL substring.
     */
    href?: string | undefined;

    /**
     * Filter substring for HTTP referrer header of the session request.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping to referrer column, allowing filtering by HTTP referrer substring.
     */
    referrer?: string | undefined;

    /**
     * Filter for sessions expiration date between specified start and end datetimes.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Maps to expired_at column, filters sessions based on expiration date range with from and to datetime properties.
     */
    expiredAt?:
      | {
          /**
           * Start of expiration date range
           */
          from?: (string & tags.Format<"date-time">) | undefined;

          /**
           * End of expiration date range
           */
          to?: (string & tags.Format<"date-time">) | undefined;
        }
      | undefined;

    /**
     * Page number of results to retrieve, minimum 1.
     *
     * @x-autobe-specification Computed pagination parameter specifying the page number of paginated results, starting from 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page for pagination.
     *
     * @x-autobe-specification Computed pagination parameter specifying max records per page, range 1-100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort key to order session listing by one of the allowed columns.
     *
     * @x-autobe-specification Computed sorting parameter specifying the column to order results by. Allowed values: created_at, expired_at, updated_at.
     */
    sort?: "created_at" | "expired_at" | "updated_at" | undefined;
  };
}
