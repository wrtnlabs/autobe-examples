import { tags } from "typia";

export namespace IShoppingMallCustomerSession {
  /**
   * Customer session management entity tracking authenticated user sessions
   * across the shopping mall marketplace platform.
   *
   * Sessions enable secure multi-device authentication while providing
   * comprehensive audit trails for security monitoring, activity analysis,
   * and customer behavior tracking throughout shopping activities, order
   * management, and account preference management workflows.
   *
   * The session system maintains security boundaries by tracking device
   * origins, connection contexts, and activity timestamps while supporting
   * automatic session expiration and concurrent session management for
   * enhanced user experience across the marketplace ecosystem.
   *
   * Each session is associated with a specific customer account and includes
   * detailed tracking information for authentication verification, device
   * fingerprinting, and security incident investigation capabilities
   * essential for fraud prevention and platform trust maintenance.
   */
  export type ISummary = {
    /**
     * Associated customer's {@link shopping_mall_customer.id} establishing
     * session ownership and enabling authentication tracking across the
     * marketplace platform while maintaining customer relationship
     * integrity for activity correlation and personalized experience
     * delivery.
     */
    shopping_mall_customer_id: string & tags.Format<"uuid">;

    /**
     * Primary key identifier for the session record enabling efficient
     * session lookup, authentication verification, and cross-system
     * reference for security monitoring and activity analysis across the
     * shopping mall platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Originating device IP address for session origin identification
     * enabling geographic access tracking, security monitoring, and
     * potential fraud detection through IP address analysis and geographic
     * restriction enforcement within the marketplace security framework.
     */
    ip: string;

    /**
     * Connection URL from which the session was established enabling HTTP
     * origin verification, session context validation, and cross-site
     * request forgery prevention while maintaining proper session
     * establishment audit trails for security analysis.
     */
    href: string;

    /**
     * Referrer URL providing traffic source analysis for marketing
     * attribution, user journey mapping, and session context understanding
     * to optimize customer experience and track marketing campaign
     * effectiveness across the marketplace platform.
     */
    referrer: string;

    /**
     * Session establishment timestamp for chronological activity tracking,
     * session lifecycle management, and security audit trail maintenance
     * supporting comprehensive session history analysis and temporal
     * relationship mapping across customer interactions.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Optional session expiration timestamp controlling automatic logout
     * timing for enhanced security through session timeout management while
     * supporting both time-based expiration and absolute session
     * termination based on security policies and user preferences.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
