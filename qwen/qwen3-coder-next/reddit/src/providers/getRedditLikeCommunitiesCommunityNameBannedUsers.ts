import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunitiesCommunityNameBannedUsers(props: {
  communityName: string;
}): Promise<IRedditLikeMember.ISummary[]> {
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { name: props.communityName },
    });
  const bannedUsers = await MyGlobal.prisma.reddit_like_bans.findMany({
    where: {
      reddit_like_community_id: community.id,
      deleted_at: null,
    },
    select: {
      bannedUser: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          created_at: true,
        },
      },
      status: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  return bannedUsers.map((b) => ({
    id: b.bannedUser.id,
    entity_type: "community" as const,
    title: b.bannedUser.display_name,
    content: "",
    score: 0,
    hit_count: 0,
    created_at: b.bannedUser.created_at.toISOString(),
  }));
}
