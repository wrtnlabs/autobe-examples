import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

export async function superadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({ request }) as SuperadminPayload;

  if (payload.type !== "superadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query super_admins table using payload.id as the top-level user ID
  // super_admins is the top-level actor table, so use 'id', not 'user_id'
  const superadmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (superadmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}