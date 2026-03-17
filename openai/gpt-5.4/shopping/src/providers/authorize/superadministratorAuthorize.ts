import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { SuperadministratorPayload } from "../../decorators/payload/SuperadministratorPayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function superadministratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadministratorPayload> {
  const payload: SuperadministratorPayload = jwtAuthorize({ request }) as SuperadministratorPayload;

  if (payload.type !== "superadministrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.shopping_mall_super_administrator_sessions.findFirst({
    where: {
      id: payload.session_id,
      shopping_mall_super_administrator_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Invalid or expired session");
  }

  const superAdministrator = await MyGlobal.prisma.shopping_mall_super_administrators.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (superAdministrator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
