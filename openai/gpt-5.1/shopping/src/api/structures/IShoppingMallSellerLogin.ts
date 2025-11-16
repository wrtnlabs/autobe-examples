import { tags } from "typia";

export namespace IShoppingMallSellerLogin {
  /**
   * Seller login request payload for authenticating an existing seller
   * account.
   *
   * Carries the seller's login email and password for verification against
   * shopping_mall_auth_credentials with actor_type "seller". This DTO is used
   * by the /auth/seller/login endpoint and includes session context fields
   * required for audit logging and security analysis.
   */
  export type IRequest = {
    /**
     * Seller's login email address used as the unique credential identifier
     * for actor_type "seller".
     *
     * Must match the email stored in shopping_mall_auth_credentials for the
     * seller actor.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password corresponding to the seller's login email.
     *
     * The backend validates this value by hashing it and comparing it
     * against the stored password_hash in shopping_mall_auth_credentials.
     * Clients MUST NOT send pre-hashed passwords.
     */
    password: string;

    /**
     * Client IP address for session tracking and security analysis.
     *
     * May be provided when the client has reliable knowledge of the
     * originating IP (for example, in SSR or trusted proxy scenarios). When
     * omitted or null, the backend derives the IP from the HTTP request
     * context.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page from which the login request was initiated.
     *
     * Used for session context, security auditing, and behavioral
     * analytics. Clients should send the canonical browser location at the
     * time of login.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page or context that led to the
     * login action.
     *
     * Used for security monitoring and funnel analysis. May be an empty
     * path-like URL when the login was initiated directly.
     */
    referrer: string & tags.Format<"uri">;
  };
}
