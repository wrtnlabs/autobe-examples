import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadministratorPayload } from "../../decorators/payload/SuperadministratorPayload";

export async function superadministratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadministratorPayload> {
  const payload: SuperadministratorPayload = jwtAuthorize({ request }) as SuperadministratorPayload;

  if (payload.type !== "superadministrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using direct id lookup since superadministrator is standalone entity
  const superadministrator = await MyGlobal.prisma.ecommerce_super_administrators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (superadministrator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}