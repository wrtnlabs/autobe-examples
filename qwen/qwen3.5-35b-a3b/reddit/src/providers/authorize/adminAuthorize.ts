import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  let payload: AdminPayload;

  try {
    payload = jwtAuthorize({ request }) as AdminPayload;
  } catch (error) {
    throw new UnauthorizedException("Invalid or expired token");
  }

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const adminSession = await MyGlobal.prisma.reddit_platform_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      admin_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (adminSession === null) {
    throw new ForbiddenException("Session has expired or is invalid");
  }

  const admin = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: {
      id: payload.id,
      is_active: true,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}