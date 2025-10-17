import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CommunitymoderatorPayload } from "../../decorators/payload/CommunitymoderatorPayload";

export async function communitymoderatorAuthorize(request: { headers: { authorization?: string } }): Promise<CommunitymoderatorPayload> {
  const payload: CommunitymoderatorPayload = jwtAuthorize({ request }) as CommunitymoderatorPayload;

  if (payload.type !== "communitymoderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const moderator = await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
    where: {
      member_id: payload.id,
      member: {
        deleted_at: null
      },
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled as a community moderator");
  }

  return payload;
}
