import { tags } from "typia";

import { IEcommerceMallAdmin } from "./IEcommerceMallAdmin";

export namespace IEcommerceMallAdminSession {
  /**
   * Summary representation of an administrator session.
   *
   * Provides essential identification and lifecycle context for admin session records, including the associated admin account via object reference. Designed for rapid browsing in administrative audit trails and session management.
   *
   * Excludes internal foreign key scalars and sensitive session tokens for lightweight list displays.
   */
  export type ISummary = {
    /**
     * The associated administrator account.
     */
    admin: IEcommerceMallAdmin.ISummary;

    /**
     * The timestamp when the session JWT token or refresh token becomes invalid or expires.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The timestamp when the session becomes invalid.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * The direct URL or route from which the session was initiated.
     */
    href: string & tags.Format<"uri">;

    /**
     * Stable identifier for the administrator session.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The client IP address where the session was originated.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * The upstream URL that directed the administrator to the authentication endpoint.
     */
    referrer?: string | null | undefined;
  };

  /**
   * Query parameters for retrieving and filtering administrator session logs.
   *
   * Accepts optional filters for administrator identity, origin URL, IP address, and time ranges. Supports pagination and ordering using the standard sort array grammar to navigate through session history.
   */
  export type IRequest = {
    /**
     * Filter sessions by the specific administrator account ID.
     *
         * @x-autobe-database-schema-property ecommerce_mall_admin_id
     */
    adminId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter sessions by the client IP address used to establish the session.
     *
         * @x-autobe-database-schema-property ip
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter sessions by the exact URL from which the session was initiated.
     *
         * @x-autobe-database-schema-property href
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Filter sessions by the upstream referrer URL that directed the user to the login page.
     */
    referrer?: string | null | undefined;

    /**
     * Retrieve sessions established on or after this timestamp.
     *
         * @x-autobe-database-schema-property created_at
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Retrieve sessions expiring on or after this timestamp.
     *
         * @x-autobe-database-schema-property expired_at
     */
    expired_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Free-text keyword to search across relevant session fields.
     */
    search?: string | undefined;

    /**
     * The specific page number of results to retrieve (one-indexed).
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * The maximum number of records to return per page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Array of sorting directives applied in order of execution priority.
     */
    sort?:
      | ("createdAt.asc" | "createdAt.desc" | "id.asc" | "id.desc")[]
      | undefined;
  };
}
