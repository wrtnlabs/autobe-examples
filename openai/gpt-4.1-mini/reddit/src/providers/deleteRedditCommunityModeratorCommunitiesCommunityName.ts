import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorCommunitiesCommunityName(props: {
  moderator: ModeratorPayload;
  communityName: string;
}): Promise<void> {
  const { moderator, communityName } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community '${communityName}' not found`, 404);
  }

  await MyGlobal.prisma.reddit_community_communities.delete({
    where: { id: community.id },
  });
}
