import { tags } from "typia";

import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IDiscussionBoardMemberSession {
  /**
   * Lightweight summary of a member authentication session for display in analytics and audit contexts. Contains essential session information including the member identity, connection metadata (IP address, authentication origin URL), and temporal boundaries (creation and expiration timestamps). Used primarily in article view analytics to track which session was used when accessing content.
   */
  export type ISummary = {
    /**
     * Unique identifier for the member authentication session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_member_sessions.id. Primary key, UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The authenticated member account associated with this session.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification FK-to-relation transformation: discussion_board_member_id → member object. JOIN discussion_board_members on id, return .ISummary type. Cascade delete on member account deletion.
     */
    member: IDiscussionBoardMember.ISummary;

    /**
     * IP address of the client device during session creation.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from discussion_board_member_sessions.ip. Client IP address captured during session creation.
     */
    ip: string;

    /**
     * URL of the page that initiated the authentication flow.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from discussion_board_member_sessions.href. URL of the page that initiated the authentication flow.
     */
    href: string;

    /**
     * HTTP referrer header from the authentication request. May be null if not provided.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from discussion_board_member_sessions.referrer. HTTP referrer header from the authentication request. Nullable field, use oneOf for string | null.
     */
    referrer: string | null;

    /**
     * Timestamp when this session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_member_sessions.created_at. Timestamp when this session was created, ISO 8601 date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session token expires.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from discussion_board_member_sessions.expired_at. Timestamp when this session token expires, ISO 8601 date-time format.
     */
    expired_at: string & tags.Format<"date-time">;
  };
}
