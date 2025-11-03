import { tags } from "typia";

import { ITodoUser } from "./ITodoUser";

export namespace ITodoUserSession {
  /**
   * User session summary DTO for Actors.todo_user_sessions. Includes
   * connection context (ip, href, referrer), lifecycle timestamps
   * (created_at, expired_at), and the owning user as a summary reference.
   * This type omits any token materials by design and is safe for
   * documentation and list views. href/referrer align with Prisma
   * VarChar(80000); referrer allows empty string to denote direct
   * navigation.
   */
  export type ISummary = {
    /** Primary key of the session. Maps to todo_user_sessions.id (UUID). */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address recorded at session establishment. Mirrors
     * todo_user_sessions.ip. Textual IPv4/IPv6 representation as captured
     * by the server.
     */
    ip: (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">);

    /**
     * Request URL at session establishment. Mirrors todo_user_sessions.href
     * (VarChar(80000)). Always present and a valid URI.
     */
    href: string & tags.MaxLength<80000> & tags.Format<"uri">;

    /**
     * Referrer URL at session establishment. Mirrors
     * todo_user_sessions.referrer (VarChar(80000)). Business semantics
     * allow an empty string to represent direct navigation with no
     * referrer; otherwise, a valid URI string is provided.
     */
    referrer: (string & tags.MaxLength<80000> & tags.Format<"uri">) | "";

    /** Session creation time. Mirrors todo_user_sessions.created_at. */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session end/invalidated time. Null means active or not yet recorded.
     * Mirrors todo_user_sessions.expired_at.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Owning user of this session. Transforms
     * todo_user_sessions.todo_user_id into a summary object to provide
     * actor context without reverse collections.
     */
    user: ITodoUser.ISummary;
  };
}
