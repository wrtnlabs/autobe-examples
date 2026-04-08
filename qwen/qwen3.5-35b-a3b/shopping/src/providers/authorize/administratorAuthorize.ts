import { ForbiddenException } from "@nestjs/common";
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

  const session = await MyGlobal.prisma.ecommerce_mall_administrator_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      administrator_id: payload.id,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}