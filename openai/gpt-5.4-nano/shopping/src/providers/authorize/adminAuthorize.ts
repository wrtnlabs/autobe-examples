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
  } catch {
    throw new UnauthorizedException("Unauthorized");
  }

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
