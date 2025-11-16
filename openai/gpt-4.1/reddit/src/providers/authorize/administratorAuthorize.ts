import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

/**
 * Authenticates the caller as an administrator.
 *
 * - Verifies JWT token and extracts the payload
 * - Ensures role is "administrator"
 * - Checks database for matching admin account by top-level user id
 * - Ensures administrator is not deleted and account is active
 * @param request HTTP request with authorization header
 * @returns AdministratorPayload
 */
export async function administratorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // Confirm administrator exists, not deleted, and is active
  const administrator = await MyGlobal.prisma.community_platform_administrators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    },
  });

  if (!administrator)
    throw new ForbiddenException("You're not enrolled or your administrator access is revoked.");

  return payload;
}
