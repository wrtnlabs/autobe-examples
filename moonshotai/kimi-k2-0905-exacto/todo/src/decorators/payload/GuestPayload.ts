import { tags } from "typia";

export interface GuestPayload {
  /** Top-level guest user table ID. */
  id: string & tags.Format<"uuid">;

  /** Guest session ID for the temporary session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator indicating guest role type. */
  type: "guest";
}
