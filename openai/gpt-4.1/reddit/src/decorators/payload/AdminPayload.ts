import { tags } from "typia";

/** Payload for authenticated platform admin. id is the top-level admin UUID. */
export interface AdminPayload {
  /** Top-level admin table UUID (primary identifier). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for admin role. */
  type: "admin";
}
