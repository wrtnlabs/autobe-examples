import { tags } from "typia";

export interface SuperadminPayload {
  /** UUID of the super administrator account. */
  id: string & tags.Format<"uuid">;

  /** UUID of the current JWT session. */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator, always "superAdmin" for super administrators. */
  type: "superAdmin";
}
