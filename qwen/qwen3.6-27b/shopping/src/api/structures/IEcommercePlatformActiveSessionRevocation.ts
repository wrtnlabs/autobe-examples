import { tags } from "typia";

export namespace IEcommercePlatformActiveSessionRevocation {
  /**
   * Confirmation response for bulk session revocation operations.
   *
   * Returns the total count of active sessions that were successfully terminated for the authenticated user. This response confirms successful execution of the revoke-all operation regardless of whether any sessions were actually found.
   */
  export type IConfirm = {
    /**
     * The total number of active sessions that were successfully revoked for the authenticated user.
     *
     * This value is always non-negative and will be zero if no active sessions were found at the time of revocation. Represents the count of sessions terminated across all devices.
     *
         * @x-autobe-specification Computed integer value representing the
         *   number of active sessions revoked. Derived from affected row counts
         *   during the session revocation transaction: - customer: COUNT from
         *   UPDATE SET deleted_at ON ecommerce_platform_customer_sessions -
         *   seller: COUNT from DELETE ON ecommerce_platform_seller_sessions -
         *   admin: COUNT from DELETE ON ecommerce_platform_admin_sessions
     *
     * Always non-negative (minimum 0). Returns 0 when no active sessions exist.
     */
    revokedCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
