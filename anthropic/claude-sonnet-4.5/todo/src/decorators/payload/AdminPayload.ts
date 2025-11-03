import { tags } from "typia";

/**
 * Payload interface for authenticated admin users.
 *
 * This interface defines the structure of the authenticated admin data that is
 * injected into controller methods when using the @AdminAuth() decorator. It
 * represents the decoded and validated JWT token payload for admin users.
 */
export interface AdminPayload {
  /**
   * Primary identifier of the admin user.
   *
   * This is the unique UUID that identifies the admin in the todo_list_admins
   * table.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session identifier for the current admin authentication session.
   *
   * This UUID references the todo_list_admin_sessions table and tracks the
   * specific login session for security auditing and session management.
   */
  session_id: string & tags.Format<"uuid">;

  /**
   * Discriminator for the role type.
   *
   * This literal type ensures type safety and enables discriminated union
   * patterns when working with multiple actor types in the system.
   */
  type: "admin";
}
