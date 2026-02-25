import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

export async function moderatorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<ModeratorPayload> {
  const payload: ModeratorPayload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using id field since moderator is standalone actor
  const moderator = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null, // Soft-delete check
      is_active: true, // Active status check
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled or your account is inactive");
  }

  return payload;
}