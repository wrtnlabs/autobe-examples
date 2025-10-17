import { tags } from "typia";

/**
 * JWT payload structure for tracked guest sessions (unauthenticated visitor to
 * discussion board).
 */
export interface GuestPayload {
  /** Guest ID (UUID) – identifies an anonymous session or device for tracking. */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the guest actor role. */
  type: "guest";
}
