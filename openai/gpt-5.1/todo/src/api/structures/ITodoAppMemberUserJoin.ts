import { tags } from "typia";

export namespace ITodoAppMemberUserJoin {
  /**
   * Request body schema for registering a new memberUser account in the
   * todoApp service.
   *
   * This DTO is consumed by the /auth/memberUser/join endpoint. It collects
   * the minimal information required to create a new authenticated member in
   * the todo_app_memberusers table, namely the email address, a plaintext
   * password, and an optional displayName to show in user interfaces.
   *
   * The backend transforms the provided password into a secure password_hash
   * field in the todo_app_memberusers model and sets initial lifecycle fields
   * such as status, created_at, and updated_at. The DTO does not expose
   * internal database fields like password_hash or status and does not accept
   * system-managed identifiers or timestamps.
   *
   * In addition, because this is a self-signup operation that establishes an
   * authenticated context and typically creates an initial member session,
   * the DTO also carries session metadata fields (ip, href, referrer). These
   * values are used to populate the corresponding session records for
   * auditability and security analysis without exposing any
   * authentication-context identifiers such as user IDs or session IDs.
   */
  export type ICreate = {
    /**
     * Email address for the new member user account.
     *
     * This value is used both as the primary login identifier and as a
     * communication channel for account-related notifications. It must be
     * unique across all records in the todo_app_memberusers table, where it
     * is enforced by a unique index, and must conform to standard email
     * formatting rules.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password for the new member user account.
     *
     * The backend hashes this value into the password_hash column of the
     * todo_app_memberusers table using a strong one-way hashing algorithm.
     * The raw password is never stored. Implementations may apply
     * additional validation rules such as minimum length or complexity
     * requirements.
     */
    password: string & tags.Format<"password">;

    /**
     * Optional human-friendly name or nickname for the member user.
     *
     * When provided, it maps to the display_name column in
     * todo_app_memberusers and is used in user-facing contexts instead of
     * the raw email. When omitted, the account may still be created with a
     * null display_name, and user interfaces may fall back to showing the
     * email address.
     */
    displayName?: string | undefined;

    /**
     * Optional client IP address observed when the member user performs
     * self-registration.
     *
     * This value represents the network-level source address of the join
     * request and is primarily used for security auditing, anomaly
     * detection, and session analytics. When supplied, it can be stored
     * alongside the initial member session record; when omitted, the server
     * implementation may instead derive the IP from the transport layer.
     *
     * The field is intentionally optional and nullable so that clients may
     * either provide an explicit value (for example, in SSR or proxy-aware
     * contexts) or leave it null and rely on the backend to infer the
     * effective IP address.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Current page URL at the time the memberUser join request is
     * initiated.
     *
     * This value captures the full connection URL from which the
     * registration action was triggered (for example, the sign-up page URL
     * in a web client). It is used when creating the initial member session
     * to record the entry point of the interaction for security auditing,
     * behavioral analytics, and troubleshooting.
     *
     * Because the backend cannot reliably infer the precise client-facing
     * URL (especially in SPA, proxy, or CDN scenarios), the client is
     * required to send this value explicitly as part of the self-signup
     * request.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL immediately preceding the memberUser join request.
     *
     * This value represents the page or location from which the user
     * navigated before reaching the registration screen, mirroring the
     * semantics of the HTTP Referer/Referrer header in a client-controlled
     * and auditable way. It is persisted with the initial session so that
     * operators can reconstruct typical onboarding paths and detect
     * suspicious navigation patterns.
     *
     * When there is no meaningful referrer (for example, direct navigation
     * or native app flows), clients should send an empty string or a
     * conventional placeholder URL consistent with the overall tracking
     * strategy, rather than omitting the field.
     */
    referrer: string & tags.Format<"uri">;
  };
}
