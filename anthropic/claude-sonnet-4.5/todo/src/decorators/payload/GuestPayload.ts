/**
 * Payload interface for guest (unauthenticated) users.
 *
 * Guests are unauthenticated users who can only access public information such
 * as the landing page and registration/login forms. They cannot create or view
 * any todo items.
 *
 * Unlike authenticated users, guests do not have:
 *
 * - User ID (no database record)
 * - Session ID (no authentication session)
 * - Any personal information or permissions
 *
 * The type discriminator is used to distinguish guest payloads from
 * authenticated user payloads in discriminated union types.
 */
export interface GuestPayload {
  /**
   * Discriminator for the discriminated union type.
   *
   * Always "guest" for unauthenticated access.
   */
  type: "guest";
}
