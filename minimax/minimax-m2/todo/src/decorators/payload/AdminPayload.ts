import { tags } from "typia";

export interface AdminPayload {
  /**
   * Top-level admin ID from the administrators table. Represents the unique
   * identifier for the administrative account in the system.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID from the administrator_sessions table. Associates the
   * authenticated session with the admin user.
   */
  session_id: string & tags.Format<"uuid">;

  /**
   * Discriminator for the discriminated union type. Identifies this payload as
   * belonging to an admin user.
   */
  type: "admin";

  /**
   * Administrator's email address. Used for identification and communication
   * purposes.
   */
  email: string;

  /**
   * Administrative role level for permission management. Valid values:
   * super_admin, admin, moderator.
   */
  role_level: string;

  /**
   * Current administrative account status. Valid values: active, suspended,
   * deactivated.
   */
  status: string;

  /** Administrator's first name for identification and audit logging. */
  first_name?: string;

  /** Administrator's last name for complete identification. */
  last_name?: string;
}
