import { ForbiddenException } from "@nestjs/common";

import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Guest authorization provider for unauthenticated access.
 *
 * Guests are unauthenticated users who can only access public information.
 * This provider returns a static guest payload without JWT verification
 * since guests do not have authentication tokens or database records.
 *
 * @param request - HTTP request object (not used for guest authorization)
 * @returns Guest payload with type discriminator
 * @throws ForbiddenException if guest access is not allowed in current context
 */
export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  // Guests should not have authorization tokens
  // If a token is present, this is not a guest request
  if (request.headers.authorization) {
    throw new ForbiddenException(
      "Guest access requires no authentication token",
    );
  }

  // Return static guest payload
  const payload: GuestPayload = {
    type: "guest",
  };

  return payload;
}
