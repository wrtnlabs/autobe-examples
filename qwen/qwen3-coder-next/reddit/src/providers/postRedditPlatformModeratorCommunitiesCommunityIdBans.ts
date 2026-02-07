import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformBanCollector } from "../collectors/RedditPlatformBanCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditPlatformBan.ICreate;
}): Promise<IRedditPlatformBan> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  const bannedUser = await MyGlobal.prisma.reddit_platform_users.findUnique({
    where: { id: props.body.user_id },
  });
  if (!bannedUser) {
    throw new HttpException("User not found", 404);
  }
  const created = await MyGlobal.prisma.reddit_platform_bans.create({
    data: await RedditPlatformBanCollector.collect({
      body: props.body,
      redditPlatformCommunities: community,
      user: bannedUser,
      bannedBy: {
        id: props.moderator.id,
      } satisfies IEntity,
    }),
  });
  return created;
}
