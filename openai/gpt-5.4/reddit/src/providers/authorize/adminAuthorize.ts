import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { AdminPayload } from "../../decorators/payload/AdminPayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function adminAuthorize(request: {
  headers: { authorization?: string | undefined };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      community_platform_admin_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
      admin: {
        deleted_at: null,
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Invalid or expired session");
  }
  return payload;
}
