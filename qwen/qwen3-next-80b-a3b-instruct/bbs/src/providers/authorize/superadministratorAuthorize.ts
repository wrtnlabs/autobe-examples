import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadministratorPayload } from "../../decorators/payload/SuperadministratorPayload";

export async function superadministratorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SuperadministratorPayload> {
  const payload: SuperadministratorPayload = jwtAuthorize({ request }) as SuperadministratorPayload;

  if (payload.type !== "superAdministrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query the super_administrators table using the top-level user ID from payload
  const superAdministrator = await MyGlobal.prisma.economic_discussion_super_administrators.findFirst({
    where: {
      id: payload.id,
      // Check for soft-delete (if deleted_at exists in schema)
      deleted_at: null
    }
  });

  if (superAdministrator === null) {
    throw new ForbiddenException("You're not enrolled or have been deactivated");
  }

  return payload;
}