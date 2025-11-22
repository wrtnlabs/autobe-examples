import { tags } from "typia";

export namespace IRedditPlatformPlatformAdministratorSession {
  /**
   * Platform administrator session management entity providing secure
   * administrative access tracking and activity monitoring across the Reddit
   * platform. Sessions are used to authenticate platform administrators and
   * track their administrative activities, enabling proper security oversight
   * and audit trails for all administrative operations.
   *
   * Sessions are automatically created when administrators log in and
   * terminated when they log out or when sessions expire. Each session tracks
   * the administrator's identity, connection context, and activity timestamps
   * for security monitoring and compliance purposes.
   *
   * Sessions are managed internally by the authentication system and are not
   * directly created or modified by clients. They provide the foundation for
   * secure administrative access and activity tracking throughout the
   * platform.
   */
  export type ISummary = {
    /** Unique identifier of the administrative session */
    id: string & tags.Format<"uuid">;

    /** Unique identifier of the platform administrator who owns this session */
    reddit_platform_platformadministrator_id: string & tags.Format<"uuid">;

    /** IP address from which the administrator is logging in */
    ip: string;

    /** URL from which the administrative session is being initiated */
    href: string & tags.Format<"uri">;

    /** Referrer URL that led to the administrative login page */
    referrer: string & tags.Format<"uri">;

    /**
     * Session creation timestamp for comprehensive audit trails and
     * administrative activity monitoring.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp for automatic logout and maximum
     * security enforcement.
     */
    expired_at: string & tags.Format<"date-time">;
  };
}
