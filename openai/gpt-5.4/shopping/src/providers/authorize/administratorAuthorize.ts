import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function administratorAuthorize(request: {
  headers: { authorization?: string | undefined };
}): Promise<AdministratorPayload> {
  const payload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator")
    throw new ForbiddenException(`You're not ${payload.type}`);

  const session = await MyGlobal.prisma.shopping_mall_administrator_sessions.findFirst({
    where: {
      id: payload.session_id,
      shopping_mall_administrator_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
    include: {
      administrator: true,
    },
  });

  if (
    session === null ||
    session.administrator === null ||
    session.administrator.deleted_at !== null ||
    session.administrator.active !== true ||
    session.administrator.banned === true
  )
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
