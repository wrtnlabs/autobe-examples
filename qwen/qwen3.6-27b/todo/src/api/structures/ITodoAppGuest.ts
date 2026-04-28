import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Guest authorization response for unregistered visitor access.
   *
   * Contains the guest account identifier and JWT token pair granting temporary access to public registration pages. This response is returned when a new guest identity is established via device fingerprint registration or when an existing guest session is refreshed. The guest UUID provides a stable identifier for the session context, while the token pair enables API authentication for the duration of the guest session.
   */
  export type IAuthorized = {
    /**
     * The unique identifier of the authenticated guest.
     *
     * This UUID identifies the guest account associated with the current session. It is retrieved via session-to-guest foreign key lookup from the todo_app_guest_sessions record, which references todo_app_guests.id. This provides a stable reference for the guest's session context across API calls.
     *
         * @x-autobe-specification Guest identity UUID derived from
         *   todo_app_guests.id via session lookup. The authenticated guest
         *   session (todo_app_guest_sessions) has a guest_id foreign key that
         *   references this UUID. Retrieved as-is from the linked
         *   todo_app_guests record during guest join or refresh operations.
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
   * Request body for refreshing a guest access token.
   *
   * Provides the current session context including the page URL being accessed, the referrer that led to that page, and optionally the client's IP address. These fields are recorded in a new guest session record for audit and security tracking purposes during the refresh operation.
   *
   * The session identifier itself is not included in this body; it is automatically extracted from the authorization token provided in the request headers.
   */
  export type IRefresh = {
    /**
     * Long-lived refresh token for obtaining new access tokens.
     *
     * Used to request new access tokens when the current access token expires, allowing session continuation without re-authentication. Should be stored securely and transmitted only to the token refresh endpoint.
     *
         * @x-autobe-specification Refresh token for obtaining new access tokens
         *   without re-authentication. Server extracts the session identifier
         *   from this token in the request body, validates the session in
         *   todo_app_guest_sessions, then generates a new JWT token pair.
     */
    refresh: string;
  };

  /**
   * Request payload used when an unregistered visitor (guest) accesses the application.
   *
   * The `device_fingerprint` identifies the user's browser or device, allowing the system to track existing guests or create new ones. The `href`, `referrer`, and `ip` are captured by the client or server to establish the environment context for the temporary guest session in `todo_app_guest_sessions`.
   */
  export type IJoin = {
    /**
     * The unique identifier computed from the user's browser or device attributes.
     *
     * The backend uses this field to find an existing guest record or to create a new one.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping from
         *   todo_app_guests.device_fingerprint.
     */
    device_fingerprint: string;

    /**
     * The URL of the webpage the guest was on when requesting access.
     *
     * Used by the server to record the user's context and establish the temporary guest session.
     *
         * @x-autobe-specification Client-provided session context. Maps to
         *   todo_app_guest_sessions.href.
     */
    href: string & tags.Format<"uri">;

    /**
     * The IP address of the guest.
     *
     * Captured by the server (SSR) or provided by the client to establish network context for the session.
     *
         * @x-autobe-specification Optional session context. Maps to
         *   todo_app_guest_sessions.ip.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * The URL of the webpage that referred the guest to the current page.
     *
     * Used by the server to record where the user came from for the temporary guest session.
     *
         * @x-autobe-specification Client-provided session context. Maps to
         *   todo_app_guest_sessions.referrer.
     */
    referrer: string & tags.Format<"uri">;
  };
}
