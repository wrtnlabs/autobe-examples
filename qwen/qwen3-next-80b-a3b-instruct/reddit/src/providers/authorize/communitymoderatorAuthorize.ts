import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CommunitymoderatorPayload } from "../../decorators/payload/CommunitymoderatorPayload";

export async function communitymoderatorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CommunitymoderatorPayload> {
  const payload: CommunitymoderatorPayload = jwtAuthorize({ request }) as CommunitymoderatorPayload;

  if (payload.type !== "communityModerator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const communitymoderator = await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
    where: {
      id: payload.id,
      is_deleted: false,
    },
  });

  if (communitymoderator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}