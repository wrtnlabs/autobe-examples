import { tags } from "typia";

export namespace IShoppingMallSellerAuthJoin {
  /**
   * Request payload for seller self-registration on the shoppingMall
   * platform.
   *
   * This DTO represents the data that a new seller submits when creating a
   * seller account. It carries the seller’s login identifier and chosen
   * password in plain text form, along with session context fields used to
   * create an initial authentication session record.
   *
   * It maps conceptually to the `shopping_mall_sellers` model for identity
   * data and to `shopping_mall_seller_sessions` for connection metadata, but
   * it does not expose any system-managed or security-sensitive storage
   * fields such as `id`, `password_hash`, lifecycle timestamps, or status
   * flags.
   */
  export type IRequest = {
    /**
     * Business contact email address that will be used as the unique login
     * identifier for the seller.
     *
     * This value maps to the `email` column of the `shopping_mall_sellers`
     * table, which has a uniqueness constraint. The email must be
     * normalized and must satisfy platform password and account policies
     * regarding allowed domains and formatting.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password chosen by the seller during registration.
     *
     * The backend will validate this value against the platform’s password
     * policy (minimum length, character classes, and other complexity
     * rules) and then derive and store a secure `password_hash` in the
     * `shopping_mall_sellers.password_hash` column. Clients must never send
     * a pre-hashed password here; hashing is always handled server-side.
     */
    password: string & tags.Format<"password">;

    /**
     * Client-reported IP address associated with the join attempt.
     *
     * This value participates in populating
     * `shopping_mall_seller_sessions.ip` for the initial seller session
     * created after successful registration. It is optional from the API
     * perspective because the server can derive the IP from the connection,
     * but providing it explicitly improves audit accuracy in proxied or SSR
     * environments.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Full URL of the page from which the seller initiated the registration
     * request.
     *
     * This value is written into `shopping_mall_seller_sessions.href` for
     * the initial session. It enables downstream analytics, attribution,
     * and security investigations by capturing the exact application route
     * involved in the join flow.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL observed when the seller initiated registration.
     *
     * This value is stored in `shopping_mall_seller_sessions.referrer` for
     * the created session and is used to analyze traffic sources and detect
     * unusual navigation patterns that may indicate abuse or fraud during
     * seller onboarding.
     */
    referrer: string & tags.Format<"uri">;
  };
}
