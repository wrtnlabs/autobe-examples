import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authorizes an admin user by verifying JWT token and validating admin status.
 *
 * This function performs the following checks:
 * 1. Verifies the JWT token using jwtAuthorize
 * 2. Checks that the payload type is 'admin'
 * 3. Queries the database to ensure the admin exists and is not deleted
 *
 * @param request - The HTTP request object containing authorization headers
 * @returns Promise resolving to the validated AdminPayload
 * @throws {ForbiddenException} If the user is not an admin or not enrolled
 * @throws {UnauthorizedException} If the JWT token is invalid
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not admin`);
  }

  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
