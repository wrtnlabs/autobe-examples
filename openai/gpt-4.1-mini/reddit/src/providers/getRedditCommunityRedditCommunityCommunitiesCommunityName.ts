import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function getRedditCommunityRedditCommunityCommunitiesCommunityName(props: {
  communityName: string;
}): Promise<IRedditCommunityCommunity> {
  const record = await MyGlobal.prisma.reddit_community_communities.findUnique({
    where: {
      name: props.communityName,
    },
  });

  if (!record) {
    throw new HttpException("Community not found", 404);
  }

  return {
    communityName: record.name,
    displayName: record.title,
    description: record.description ?? "",
    createdAt: toISOStringSafe(record.created_at),
    isPrivate: false,
  } satisfies IRedditCommunityCommunity;
}
