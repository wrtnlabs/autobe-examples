import { tags } from "typia";

export namespace IDiscussionBoardMemberUserJoin {
  /**
   * Registration payload for creating a new member user account in the
   * discussionBoard service backed by the discussion_board_memberusers
   * table.
   *
   * This DTO supplies business-level registration data such as email, raw
   * password, display name, and optional profile fields. The backend hashes
   * the password into the password_hash column and initializes lifecycle
   * fields like account_status, created_at, and email_verified according to
   * business rules.
   *
   * The DTO intentionally omits system-managed fields (id, timestamps,
   * lifecycle flags) and any actor identity or restriction information. It
   * also includes session context fields used to create the initial member
   * session and support security analytics.
   */
  export type IRequest = {
    /**
     * Unique email address for the member user. Serves as the primary login
     * identifier and contact address. Must not conflict with any existing
     * discussion_board_memberusers.email value.
     */
    email: string & tags.Format<"email">;

    /**
     * Raw password chosen by the user during registration. The backend
     * hashes this value using a strong one-way hashing algorithm and stores
     * only the resulting password_hash in the discussion_board_memberusers
     * table.
     */
    password: string;

    /**
     * Public display name (nickname) shown on articles and comments
     * authored by the member. Must be a non-empty string and may be subject
     * to additional validation or profanity filters.
     */
    displayName: string & tags.MinLength<1> & tags.MaxLength<64>;

    /**
     * Optional short biography or self-introduction shown on the member
     * profile. When provided, this text is persisted to the bio column of
     * discussion_board_memberusers; explicitly null indicates that the
     * member chose not to set a biography at registration time.
     */
    bio?: string | null | undefined;

    /**
     * Optional free-form text describing the member's location, such as
     * city, country, or region. Stored in the location column of
     * discussion_board_memberusers when non-null; explicit null indicates
     * that the member prefers not to disclose any location information at
     * registration.
     */
    location?: string | null | undefined;

    /**
     * Optional client IP address associated with the registration request.
     * When present it should be an IPv4 or IPv6 textual representation and
     * is used for security logging, fraud detection, and rate limiting.
     * Explicit null indicates that the client did not send an IP value and
     * the backend may infer it from the transport layer or leave it unset.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) at the time of registration. Used
     * to create or update the initial member session context and support
     * security analytics.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) when the registration form was
     * submitted. Helps populate session context and analyze signup
     * funnels.
     */
    referrer: string & tags.Format<"uri">;
  };
}
