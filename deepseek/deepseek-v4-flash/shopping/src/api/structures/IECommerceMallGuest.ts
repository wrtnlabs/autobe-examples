import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IECommerceMallGuest {
  /**
   * Device identifier and page navigation context for registering a new guest account on the e-commerce platform.
   *
   * The guest joins the platform by providing a unique device or browser fingerprint identifier collected client-side via fingerprinting techniques. This identifier serves as the guest's identity across visits, enabling session continuity, rate limiting, and CSRF protection on authentication pages.
   *
   * Along with the device identifier, the guest provides navigation context — the current page URL (href) and the previous page URL (referrer) — for session tracking and analytics within the authentication boundary (login and registration pages). The client's IP address is automatically captured by the server from the HTTP request context but can optionally be provided by the client in server-side rendering scenarios.
   *
   * Upon successful join, a guest record is created or reused, a new session is established, and JWT authentication tokens are returned for subsequent API access.
   */
  export type IJoin = {
    /**
     * Unique device or browser fingerprint identifier used to recognize an unauthenticated guest across visits to the authentication boundary.
     *
     * This identifier is collected client-side via browser fingerprinting techniques and transmitted to the server on auth page requests. Each distinct device or browser gets exactly one guest record, ensuring consistent guest identity for session continuity, rate limiting, and CSRF protection.
     *
     * If a guest record already exists for the given device_identifier, the existing guest is reused with a new session. Otherwise, a new guest record is created.
     *
         * @x-autobe-specification Maps to
         *   e_commerce_mall_guests.device_identifier column. Used to find
         *   existing guest record (where deleted_at IS NULL) or create a new
         *   one. Unique constraint on device_identifier prevents duplicate
         *   guest records. Client-side fingerprinting technique collects this
         *   value.
     */
    device_identifier: string;

    /**
     * Full URL of the current page the guest is accessing within the authentication boundary.
     *
     * Captures the navigation context for session tracking and analytics purposes. Limited to login and registration pages per the guest actor restrictions — guests cannot access any other platform pages.
     *
         * @x-autobe-specification Maps to e_commerce_mall_guest_sessions.href
         *   column. Stores the current page URL the guest is accessing within
         *   the authentication boundary. Used during session creation alongside
         *   server-captured session metadata.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header value indicating the previous page URL from which the guest navigated to the current page.
     *
     * Used for navigation flow tracking and analytics within the authentication boundary. Helps identify how guests arrive at login and registration pages.
     *
         * @x-autobe-specification Maps to
         *   e_commerce_mall_guest_sessions.referrer column. Stores the HTTP
         *   Referrer header value indicating the previous page URL. Used during
         *   session creation for navigation flow tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the client device making the registration request.
     *
     * Typically captured automatically by the server from the HTTP request context. In server-side rendering (SSR) scenarios where the server cannot determine the true client IP, the client may explicitly provide this value. Used for security monitoring, rate limiting, and audit purposes.
     *
         * @x-autobe-specification Maps to e_commerce_mall_guest_sessions.ip
         *   column. IP address is captured server-side from the HTTP request
         *   context by default. In SSR (Server-Side Rendering) scenarios, the
         *   client may explicitly provide this value as a fallback when the
         *   server cannot determine the true client IP (e.g., behind a proxy).
         *   The specification uses: body.ip ?? serverCapturedIp.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing a guest session by exchanging a valid refresh token for a new set of authentication tokens.
   *
   * The refresh token is a long-lived JWT used for token rotation. The href and referrer fields capture the current page context for session tracking and analytical purposes. The client's IP address is captured server-side and does not need to be sent in the request body.
   */
  export type IRefresh = {
    /**
     * The long-lived JWT refresh token issued during guest registration (join) or a previous refresh operation.
     *
     * Used for token rotation to obtain a new session with updated access and refresh tokens. The old session associated with this refresh token is invalidated upon successful rotation, and a new session is created with a fresh expiration timestamp. If a previously rotated refresh token is presented (reuse detection), all active sessions for that guest should be invalidated as a precaution against token theft.
     *
         * @x-autobe-specification JWT refresh token issued during a previous
         *   guest join or successful refresh operation. Used for token
         *   rotation: the existing session associated with this token is
         *   invalidated, and a new session with fresh tokens is created. No
         *   direct DB column — the token is a computed JWT whose payload
         *   contains claims linking back to the guest session record for
         *   validation purposes.
     */
    refreshToken: string;

    /**
     * Full URL of the page the guest is currently accessing within the authentication boundary.
     *
     * Used for session context tracking and analytics. Captures the current page context for accurate session metadata on each refresh operation. This value is stored in the new session record created during refresh.
     *
         * @x-autobe-specification Carries the guest's current page URL within
         *   the authentication boundary. This value from the request body is
         *   stored in the e_commerce_mall_guest_sessions.href column of the new
         *   session record created during the refresh operation.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header value indicating the previous page URL from which the guest navigated.
     *
     * Used for navigation flow tracking and analytics within the authentication boundary. This value is stored in the new session record created during refresh to maintain accurate session context.
     *
         * @x-autobe-specification Carries the HTTP Referrer header value. This
         *   value from the request body is stored in the
         *   e_commerce_mall_guest_sessions.referrer column of the new session
         *   record created during the refresh operation.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authentication response returned upon successful guest registration or session refresh.
   *
   * Contains the guest's unique identifier and JWT-based authentication tokens for authorizing subsequent API requests within the authentication boundary (login and registration pages only). The id field identifies the guest account associated with the device fingerprint, while the token bundle provides both a short-lived access token for immediate API authorization and a long-lived refresh token for obtaining new tokens before session expiration.
   *
   * Guest sessions have a limited lifetime defined by the expired_at timestamp within the token bundle. The refresh endpoint allows exchanging a valid refresh token for a new session with updated tokens without requiring re-registration. Token rotation is enforced each refresh: the old refresh token is consumed and a new one is issued to mitigate the risk of stolen token theft. If a previously rotated token is presented (reuse detection), all active sessions for that guest should be invalidated as a precaution.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account.
     *
     * This UUID maps to the primary key of the guest record in e_commerce_mall_guests, identified during registration or session refresh. It identifies the guest across their sessions on the platform and is associated with the device fingerprint used for guest recognition. This is the guest's permanent identity UUID, distinct from any session-level identifiers.
     *
         * @x-autobe-specification Direct mapping from
         *   e_commerce_mall_guests.id. Retrieved during guest registration
         *   (join) which creates or reuses the guest record, or during session
         *   refresh which returns the same guest ID. This is the guest's
         *   identity UUID, distinct from any session-level IDs in
         *   e_commerce_mall_guest_sessions.
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
}
