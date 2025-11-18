import { tags } from "typia";

export namespace IShoppingMallCustomerLogin {
  /**
   * Request payload for customer self-login.
   *
   * Contains the customer's primary login identifier and password along with
   * session context information required to establish a new
   * shopping_mall_customer_sessions row. This DTO is used when a customer
   * actively logs in with credentials, and therefore must include connection
   * metadata (href and referrer, and optionally ip) for security auditing and
   * risk analysis.
   */
  export type IRequest = {
    /**
     * Customer email address used as the unique login identifier.
     *
     * Must correspond to the email column in shopping_mall_customers and is
     * validated using standard email format rules.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the customer for authentication.
     *
     * This value is compared against the stored hashed password (e.g.,
     * password_hash) in shopping_mall_customers by the backend. Clients
     * MUST NOT pre-hash this value.
     */
    password: string;

    /**
     * Optional client IP address for the login attempt.
     *
     * When present, this value is stored in
     * shopping_mall_customer_sessions.ip for security and auditing
     * purposes. If omitted or null, the server may derive the IP from the
     * HTTP request instead.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL at the moment of login.
     *
     * Captured in shopping_mall_customer_sessions.href to record the exact
     * location from which the login was initiated (for example, a specific
     * login page or redirect target).
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led the customer to the login page.
     *
     * Captured in shopping_mall_customer_sessions.referrer to support
     * security investigation, funnel analysis, and risk evaluation related
     * to the login event.
     */
    referrer: string & tags.Format<"uri">;
  };
}
