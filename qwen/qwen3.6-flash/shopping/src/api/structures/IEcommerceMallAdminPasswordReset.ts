import { tags } from "typia";

import { IEcommerceMallAdmin } from "./IEcommerceMallAdmin";

export namespace IEcommerceMallAdminPasswordReset {
  /**
   * Summary representation of a password reset request record.
   *
   * Provides essential security audit details including the originating client IP address, the client User-Agent string used during the request, creation and expiration timestamps for the recovery token, and the requesting administrator's identity. Optimized for paginated list views in admin dashboards.
   *
   * Security: The actual reset token is explicitly excluded from audit views to prevent credential leakage.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset request record.
     *
     * Universally unique identifier used as the primary key in the database and for API routing.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_admin_password_resets.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The network IP address captured from the client that initiated the password reset request.
     *
     * Used for audit trail and security monitoring of password recovery attempts.
     *
         * @x-autobe-database-schema-property ip
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_admin_password_resets.ip. IPv4 string (VarChar(15)).
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * The client User-Agent string identifying the software and platform used to request the password reset.
     *
     * Captured automatically when the password reset request is created, supporting audit trail security analysis.
     *
         * @x-autobe-database-schema-property ua
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_admin_password_resets.ua. Free-form User-Agent
         *   string.
     */
    ua: string;

    /**
     * Timestamp of password reset request creation.
     *
     * Records the exact database time when the password reset request was created and the recovery token was issued.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_admin_password_resets.created_at. Non-null
         *   timestamptz.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Token expiration timestamp.
     *
     * Records the deadline when the password reset token expires and is no longer valid for password recovery.
     *
         * @x-autobe-database-schema-property expired_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_admin_password_resets.expired_at. Non-null
         *   timestamptz.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * The administrator account who initiated the password reset request.
     *
     * Fully resolved relation to the admin entity, allowing admin oversight to see the requesting administrator's identity and grade for audit purposes.
     *
         * @x-autobe-database-schema-property adminPasswordReset
         * @x-autobe-specification Join via adminPasswordReset FK to
         *   ecommerce_mall_admins. Returns IEcommerceMallAdmin.ISummary with
         *   id, email, grade, created_at, updated_at.
     */
    admin: IEcommerceMallAdmin.ISummary;
  };
}
