import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmPlatformGuest {
  /**
   * Request body for refreshing an existing guest session.
   *
   * The refresh token validates the guest's identity and extends their session for continued access to public entry points without requiring re-authentication.
   */
  export type IRefresh = {
    /**
     * The guest refresh token used to validate the guest's identity and extend their session.
     *
     * This token was issued during the initial guest session creation or a previous refresh operation. It must be included to prove the guest's authenticated state for continued access to public entry points. The token is validated server-side for signature integrity, expiration status, and guest record availability before a new token pair is issued.
     *
         * @x-autobe-specification Refresh token string provided by the client
         *   for session renewal. This token is extracted from the previous
         *   IAuthorizationToken.refresh field. Server validates: (1) JWT
         *   signature, (2) expiration time, (3) guest ID claims mapping to an
         *   existing non-deleted guest record in hrm_platform_guests. Upon
         *   validation, the server creates a new hrm_platform_guest_sessions
         *   record and issues a new token pair. This is an input parameter with
         *   no direct database column correspondence.
     */
    refresh: string;
  };

  /**
   * Authorization response containing guest identity and session tokens for unauthenticated public entry point browsing.
   *
   * This response is returned when a guest joins or refreshes their session, containing the guest profile identifier and token object with access and refresh tokens for session management.
   *
   * The id field uniquely identifies the guest profile tied to a specific device fingerprint. The token object contains short-lived access tokens for API authentication and long-lived refresh tokens for session renewal, along with their respective expiration timestamps.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest profile.
     *
     * This UUID identifies the anonymous visitor's guest profile, which is tied to a specific device fingerprint. It provides continuity for the unauthenticated visitor across public entry point page visits.
     *
         * @x-autobe-specification Computed from hrm_platform_guests.id. The
         *   server looks up or creates the guest profile by device_fingerprint
         *   and returns its primary key UUID. This value allows downstream
         *   consumers to correlate the guest identity across subsequent API
         *   calls.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for establishing an anonymous guest identity on the platform.
   *
   * An unauthenticated visitor submits their device fingerprint along with session context (href, and optionally ip, referrer) to create or resume a guest profile for browsing public entry points such as sign-up and login pages.
   *
   * The device fingerprint uniquely identifies the visitor's browser and device characteristics. Session context fields record the current page URL, referring source URL, and client IP address for tracking purposes. The backend creates both the guest profile and initial session in a single transaction, then returns authentication tokens for maintaining session state while browsing public pages.
   */
  export type IJoin = {
    /**
     * Unique identifier representing the visitor's browser and device characteristics.
     *
     * This fingerprint correlates anonymous visits across public entry points like sign-up and login pages. The backend uses this unique constraint to either retrieve an existing guest profile or create a new one. This field is required and enables continuity for visitors returning to the platform before registration.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping from
         *   hrm_platform_guests.device_fingerprint. Unique constraint used for
         *   find-or-create lookup: backend queries this unique index to either
         *   retrieve existing guest or create a new one. Requires minLength: 1
         *   validation. User-provided string identifying the visitor's browser
         *   and device characteristics.
     */
    device_fingerprint: string & tags.MinLength<1>;

    /**
     * The current page URL where the guest is browsing.
     *
     * This uri-formatted URL records which public entry point the visitor is accessing. The backend stores this in the guest session record associated with this join operation.
     *
         * @x-autobe-specification Maps to hrm_platform_guest_sessions.href.
         *   Required field provided by client indicating the current page URL
         *   where the guest is browsing. Format: uri. Stored in the guest
         *   sessions table, not the guests table. The backend creates a session
         *   record with this value.
     */
    href: string & tags.Format<"uri">;

    /**
     * The visitor's client IP address.
     *
     * This field is optional since client may not know its own IP address, especially in Server Side Rendering (SSR). The backend captures the server-side IP as fallback (body.ip ?? serverIp). Stored in the associated guest session record.
     *
         * @x-autobe-specification Maps to hrm_platform_guest_sessions.ip.
         *   Optional field: the client may not know its own IP address in SSR
         *   scenarios. Backend falls back to body.ip ?? serverIp logic. Format:
         *   ipv4. Stored in the guest sessions table, not the guests table.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * The referring source URL that led the visitor to the current page.
     *
     * This optional field records where the visitor came from before reaching the public entry point. Nullable - visitors may arrive directly without a referrer. Stored in the associated guest session record.
     *
         * @x-autobe-specification Maps to hrm_platform_guest_sessions.referrer.
         *   Optional/nullable field indicating the referring source URL.
         *   Format: uri. Stored in the guest sessions table, not the guests
         *   table. Nullable in database (String?).
     */
    referrer: string & tags.Format<"uri">;
  };
}
