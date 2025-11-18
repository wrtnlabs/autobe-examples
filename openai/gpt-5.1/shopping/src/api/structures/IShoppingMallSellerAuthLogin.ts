import { tags } from "typia";

export namespace IShoppingMallSellerAuthLogin {
  /**
   * Request body schema for seller login on the shopping mall platform.
   *
   * Carries the seller’s login identifier and plaintext password, along with
   * session context metadata used to create a `shopping_mall_seller_sessions`
   * record. The password will be verified against the `password_hash` column
   * in `shopping_mall_sellers`. The session fields are used to populate
   * contextual columns such as `ip`, `href`, and `referrer` in the seller
   * session table.
   *
   * This DTO is used by the `/auth/seller/login` endpoint, which has
   * `authorizationType: "login"` and `authorizationActor: null`, meaning it
   * is a self-login operation and MUST include session context fields. The
   * backend will never accept pre-hashed passwords here; it always expects
   * the raw password string for verification and will not read any seller ID
   * from the body.
   */
  export type IRequest = {
    /**
     * Seller’s login email address.
     *
     * This value is used to look up the seller row in
     * `shopping_mall_sellers` via the unique index on
     * `shopping_mall_sellers.email`. It must be a syntactically valid email
     * address and is treated as the primary login identifier for seller
     * accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the seller for authentication.
     *
     * The backend compares this value against the stored `password_hash` in
     * `shopping_mall_sellers` using a secure password verification
     * algorithm. Clients MUST NOT send pre-hashed passwords; hashing is
     * handled entirely by the server.
     *
     * This field is never stored or logged in plain text and is only used
     * transiently for credential verification during the login request.
     */
    password: string;

    /**
     * Optional client IP address associated with this login attempt.
     *
     * When provided, it should contain a valid IPv4 or IPv6 address string.
     * If null or absent, the server may attempt to infer the IP from the
     * transport layer. This value is used for populating IP-related fields
     * in `shopping_mall_seller_sessions` and for later security analysis.
     */
    ip?: string | null | undefined;

    /**
     * Absolute URL of the page from which the seller initiated the login
     * request.
     *
     * This value is stored as part of the seller session context (for
     * example in `shopping_mall_seller_sessions.href`) to support security
     * investigations, UX analytics, and anomaly detection. It should be the
     * full URL (including scheme, host, path, and query) of the current
     * page where the login form was submitted.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led the seller to the login page.
     *
     * Typically corresponds to the browser’s `document.referrer` value at
     * the moment the login form is submitted. This value is used to
     * populate referrer-related fields in `shopping_mall_seller_sessions`
     * and can assist in security investigations and traffic analysis.
     *
     * If there is no referrer (for example, direct navigation), clients may
     * send an empty string or a canonical placeholder URL according to
     * frontend conventions.
     */
    referrer: string & tags.Format<"uri">;
  };
}
