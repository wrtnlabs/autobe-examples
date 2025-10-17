// File: src/decorators/payload/RegistereduserPayload.ts
import { tags } from "typia";

/**
 * Payload injected by RegistereduserAuth decorator. Top-level registered user
 * table ID is carried in 'id' and 'type' discriminator.
 */
export interface RegistereduserPayload {
  /** Top-level user table ID (UUID). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated role. */
  type: "registereduser";
}
