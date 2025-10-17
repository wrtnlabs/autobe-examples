// File path: src/decorators/payload/MemberPayload.ts
import { tags } from "typia";

export interface MemberPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated actor. */
  type: "member";
}
