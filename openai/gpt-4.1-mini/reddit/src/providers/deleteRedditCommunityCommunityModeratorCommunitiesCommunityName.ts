import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorCommunitiesCommunityName(props: {
  communityModerator: CommunitymoderatorPayload;
  communityName: string;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (community === null) {
    throw new HttpException("Community not found", 404);
  }

  await MyGlobal.prisma.reddit_community_communities.delete({
    where: { name: props.communityName },
  });
}
