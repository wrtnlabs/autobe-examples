// File path: src/decorators/payload/SystemadminPayload.ts
import { tags } from "typia";

export interface SystemadminPayload {
  /** Top-level system administrator ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with this authentication session (UUID) */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated actor type */
  type: "systemadmin";
}
