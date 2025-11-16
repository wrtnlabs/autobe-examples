import { tags } from "typia";

export namespace IShoppingMallGuestUserJoin {
  /**
   * Request payload for registering a new guestUser identity on the shopping
   * mall platform.
   *
   * This DTO carries benign context about an unauthenticated visitor, such as
   * a temporary identifier, client IP, user agent, and an optional guest cart
   * token to associate an existing anonymous cart with the new guest
   * identity. It does not contain passwords, emails, or other credential
   * material; guest users are authenticated purely by tokens issued after
   * this join.
   *
   * The backend uses this payload to create a new row in
   * `shopping_mall_guestuser`, optionally link a `shopping_mall_guest_carts`
   * record when a matching `guest_token` is supplied, and write audit entries
   * into `shopping_mall_auth_logs` and `shopping_mall_security_events`.
   */
  export type IRequest = {
    /**
     * Opaque client-side identifier used to correlate pre-registration
     * behavior with the new guestUser.
     *
     * This is typically derived from cookies or local storage and may be
     * used in `shopping_mall_security_events.actor_identifier` or analytics
     * systems. The value should be treated as an opaque string without
     * semantic meaning to the server.
     */
    temporaryIdentifier: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Optional token that identifies an existing anonymous guest cart to be
     * associated with the new guestUser.
     *
     * When provided, the backend looks up a `shopping_mall_guest_carts` row
     * by its unique `guest_token` and, if found, links it to the created
     * `shopping_mall_guestuser` via
     * `shopping_mall_guest_carts.shopping_mall_guestuser_id`. If not
     * provided or not found, no cart association is performed.
     */
    guestCartToken?: string | null | undefined;

    /**
     * Optional client IP address associated with the guest registration
     * request.
     *
     * If supplied, it should contain a textual IPv4 or IPv6 address and is
     * recorded to `shopping_mall_auth_logs` and
     * `shopping_mall_security_events` for security analytics and funnel
     * tracking.
     */
    ip?: string | null | undefined;

    /**
     * Optional user agent string of the client performing the guest
     * registration.
     *
     * Typical values mirror HTTP User-Agent headers and are persisted into
     * authentication and security logs for device analytics and anomaly
     * detection.
     */
    userAgent?: string | null | undefined;

    /**
     * Current page URL at the time of guest registration.
     *
     * This field captures the connection context for the new guest session,
     * allowing later analysis of which landing pages drive guest
     * conversions. It is stored alongside session and audit records.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page) that led the visitor to the registration
     * action.
     *
     * This field is used for attribution and funnel analytics and is
     * typically derived from the browser's document.referrer value or
     * equivalent client-side context.
     */
    referrer: string & tags.Format<"uri">;
  };
}
