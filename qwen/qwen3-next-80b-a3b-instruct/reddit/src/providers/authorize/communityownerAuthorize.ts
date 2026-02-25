import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CommunityownerPayload } from "../../decorators/payload/CommunityownerPayload";

export async function communityownerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CommunityownerPayload> {
  const payload: CommunityownerPayload = jwtAuthorize({ request }) as CommunityownerPayload;

  if (payload.type !== "communityOwner") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const communityOwner = await MyGlobal.prisma.reddit_community_community_owners.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (communityOwner === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}