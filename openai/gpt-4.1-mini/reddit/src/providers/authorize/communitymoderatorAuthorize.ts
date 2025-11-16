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
      id: payload.id,
      deleted_at: null
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.reddit_community_community_moderator_sessions.findFirst({
    where: {
      id: payload.session_id,
      reddit_community_community_moderator_id: payload.id,
      expired_at: null
    }
  });

  if (session === null) {
    throw new ForbiddenException("Session invalid or expired");
  }

  return payload;
}
