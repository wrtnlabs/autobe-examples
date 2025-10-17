import { tags } from "typia";

/** Payload injected by UserAuth decorator representing an authenticated user. */
export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the user role. */
  type: "user";
}
