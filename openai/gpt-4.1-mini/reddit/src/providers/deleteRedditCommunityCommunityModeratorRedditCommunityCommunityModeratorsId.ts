import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorRedditCommunityCommunityModeratorsId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  const existingModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: { id },
    });

  if (!existingModerator) {
    throw new HttpException("Community moderator not found", 404);
  }

  await MyGlobal.prisma.reddit_community_community_moderators.delete({
    where: { id },
  });
}
