import { tags } from "typia";

import { IDiscussionBoardModerator } from "./IDiscussionBoardModerator";

export namespace IDiscussionBoardModeratorSession {
  /**
   * Summary representation of a moderator authentication session. Captures
   * session metadata including connection context (IP, URL, referrer), timing
   * information, and moderator identification.
   *
   * Sessions represent moderator logins from specific IP addresses and track
   * the connection context for security and audit purposes. Sessions are
   * critical for monitoring administrative access patterns and detecting
   * unauthorized access attempts.
   *
   * The summary includes all essential session information for tracking and
   * auditing purposes without requiring full detailed records.
   */
  export type ISummary = {
    /** Unique identifier for the moderator session. */
    id: string & tags.Format<"uuid">;

    /**
     * IP address (IPv4 or IPv6) from which the moderator login originated.
     * Critical for security monitoring of administrative access and
     * detecting unauthorized login attempts.
     */
    ip: string;

    /**
     * Full URL/URI where moderator login occurred. Captures the entry point
     * for moderation dashboard access.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header value when moderator login occurred. Indicates
     * source of authentication request. May be empty string if referrer not
     * available.
     */
    referrer: string;

    /**
     * Session creation timestamp (login time) in UTC. Records when
     * moderator authentication session was established. Immutable.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session termination timestamp. Non-null when session ends (moderator
     * logout or automatic expiration). Null for active sessions. Sessions
     * expire after 7 days or explicit logout.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Summary information about the moderator who owns this session. */
    moderator: IDiscussionBoardModerator.ISummary;
  };
}
