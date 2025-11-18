import { tags } from "typia";

export namespace IShoppingMallCustomerJoin {
  /**
   * Request body schema for a self-service customer registration (join)
   * operation in the shoppingMall platform.
   *
   * This DTO collects the minimal credential and context information required
   * to create a new row in the shopping_mall_customers table and to
   * immediately establish a first authenticated session in
   * shopping_mall_customer_sessions. It maps to the core identity columns
   * while keeping sensitive persistence details such as password_hash
   * internal to the backend.
   *
   * The payload contains the email and plain text password that will be
   * validated and transformed into the password_hash column, as well as
   * connection metadata (ip, href, referrer) that is stored in
   * shopping_mall_customer_sessions for audit and security analysis. The ip
   * value is optional because it can be derived by the server, while href and
   * referrer are required business fields used for session context and
   * marketing attribution.
   */
  export type IRequest = {
    /**
     * Unique email address the customer will use as their primary login
     * identifier and for account-related communication.
     *
     * This value is validated for proper email format and checked against
     * the unique index on shopping_mall_customers.email to ensure no
     * existing account already uses it. On success, it is persisted
     * directly into the email column of the shopping_mall_customers row.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the registering customer.
     *
     * The backend hashes this value according to the platform’s credential
     * policy and stores the result in the password_hash column of
     * shopping_mall_customers. The raw password is never persisted and is
     * only used transiently for hash generation and validation.
     */
    password: string & tags.Format<"password">;

    /**
     * Client IP address associated with the registration request.
     *
     * This optional field is primarily used for security analytics, fraud
     * detection, and geo-based risk scoring when creating a row in
     * shopping_mall_customer_sessions.ip. When omitted or null, the backend
     * derives the IP from the incoming connection metadata.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Full URL (href) of the page where the customer began the registration
     * flow.
     *
     * This value is stored in the href column of
     * shopping_mall_customer_sessions and provides contextual information
     * for security reviews, marketing attribution, and behavioral
     * analytics. It should be the exact browser URL, including query
     * parameters, at the moment of joining.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL reported by the client when the registration was
     * initiated.
     *
     * The value is written into the referrer column of
     * shopping_mall_customer_sessions, enabling the platform to analyze
     * traffic sources, detect unusual referral patterns, and support
     * campaign attribution for new customer registrations.
     */
    referrer: string & tags.Format<"uri">;
  };
}
