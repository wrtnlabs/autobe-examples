import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

export async function administratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const administrator = await MyGlobal.prisma.mall_platform_administrators.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (administrator === null) {
    throw new UnauthorizedException("Administrator account not found");
  }

  const session = await MyGlobal.prisma.mall_platform_administrator_sessions.findFirst({
    where: {
      id: payload.session_id,
      administrator_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Administrator session is invalid");
  }

  return payload;
}