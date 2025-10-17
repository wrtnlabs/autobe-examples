import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

/**
 * Verifies JWT and ensures the caller is an enrolled administrator.
 */
export async function administratorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdministratorPayload> {
  const payload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level registered user ID
  const admin = await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
    where: {
      registereduser_id: payload.id,
      deleted_at: null,
      registereduser: {
        deleted_at: null,
        is_banned: false,
      },
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
