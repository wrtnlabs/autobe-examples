import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const adminSession = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
    },
  });

  if (adminSession === null) {
    throw new ForbiddenException("Your session has expired");
  }

  return payload;
}