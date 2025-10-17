// File path: src/decorators/payload/TodomemberPayload.ts
import { tags } from "typia";

/**
 * JWT payload for authenticated Todo Member.
 *
 * - Id always refers to the top-level user table primary key. For this role, it
 *   is `todo_list_todo_members.id`.
 */
export interface TodomemberPayload {
  /** Top-level user table ID (todo_list_todo_members.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for union narrowing. */
  type: "todomember";

  /** Member login identifier. */
  email: string & tags.Format<"email">;

  /** Creation timestamp of the member record. */
  created_at: string & tags.Format<"date-time">;

  /** Last update timestamp of the member record. */
  updated_at: string & tags.Format<"date-time">;

  /** Soft deletion timestamp; null when active. */
  deleted_at: null | (string & tags.Format<"date-time">);
}
