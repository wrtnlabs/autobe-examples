// File path: src/decorators/payload/GuestPayload.ts
import { tags } from "typia";

export interface GuestPayload {
  /** Top-level guest ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest (UUID) */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator */
  type: "guest";
}
