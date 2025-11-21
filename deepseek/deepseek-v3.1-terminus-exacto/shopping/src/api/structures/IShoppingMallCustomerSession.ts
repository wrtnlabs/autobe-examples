import { tags } from "typia";

export namespace IShoppingMallCustomerSession {
  /**
   * Summary representation of customer authentication sessions for audit and
   * tracking purposes.
   *
   * Provides essential session information for maintaining the connection
   * between customer activities and their authentication context. Each
   * session represents a distinct login instance with its own security
   * context and expiration timeline.
   *
   * Used primarily in order contexts to maintain audit trails and ensure
   * accountability for customer actions. The summary format excludes detailed
   * connection information for efficiency in list displays and reference
   * purposes.
   *
   * Sessions are managed through authentication flows and provide temporal
   * context for customer activities on the platform.
   */
  export type ISummary = {
    /**
     * Unique identifier for the customer authentication session.
     *
     * Primary key that uniquely identifies each customer session record in
     * the system. Used for session tracking, audit purposes, and linking
     * session data to customer activities.
     *
     * The UUID format ensures global uniqueness and prevents collision
     * across distributed systems.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the customer session was created and authentication
     * was established.
     *
     * Records the exact moment when the customer successfully authenticated
     * and the session was initialized. This timestamp is crucial for
     * session expiration calculations and security monitoring.
     *
     * Used for audit trails to track customer login patterns and session
     * duration analysis.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
