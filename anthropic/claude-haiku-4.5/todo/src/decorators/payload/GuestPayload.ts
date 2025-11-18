/**
 * Guest authentication payload.
 *
 * Represents an unauthenticated user (guest) with minimal information. Guests
 * have access to public endpoints such as user registration and login.
 */
export interface GuestPayload {
  /**
   * Discriminator for the discriminated union type. Identifies this as a guest
   * actor.
   */
  type: "guest";
}
