import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Guest authorization function.
 * 
 * Guests are unauthenticated users who have access to public endpoints
 * such as registration and login. This function simply returns a basic
 * guest payload without requiring JWT verification or database lookups.
 */
export async function guestAuthorize(): Promise<GuestPayload> {
  const payload: GuestPayload = {
    type: "guest",
  };

  return payload;
}