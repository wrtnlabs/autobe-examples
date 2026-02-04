import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

export async function administratorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using the administrator table directly since it's the primary actor
  // Check for soft-delete and active status if those fields exist in schema
  const administrator = await MyGlobal.prisma.economic_discussion_administrators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (administrator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}