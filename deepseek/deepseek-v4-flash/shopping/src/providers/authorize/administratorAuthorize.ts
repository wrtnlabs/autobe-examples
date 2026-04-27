import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

export async function administratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify administrator exists and is not soft-deleted
  const admin = await MyGlobal.prisma.e_commerce_mall_administrators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Verify session exists and hasn't expired
  const session = await MyGlobal.prisma.e_commerce_mall_administrator_sessions.findFirst({
    where: {
      id: payload.session_id,
      e_commerce_mall_administrator_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  return payload;
}