import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { PlatformadminPayload } from "../../decorators/payload/PlatformadminPayload";

export async function platformadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<PlatformadminPayload> {
  const payload: PlatformadminPayload = jwtAuthorize({ request }) as PlatformadminPayload;

  if (payload.type !== "platformadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const admin = await MyGlobal.prisma.reddit_community_platform_admins.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}