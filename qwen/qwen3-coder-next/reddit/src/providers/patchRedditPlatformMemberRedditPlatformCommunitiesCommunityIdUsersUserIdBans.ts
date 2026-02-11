import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformBanCollector } from "../collectors/RedditPlatformBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformBanTransformer } from "../transformers/RedditPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberRedditPlatformCommunitiesCommunityIdUsersUserIdBans(props: {
  member: MemberPayload;
  communityId: string;
  userId: string;
  body: IRedditPlatformBan.ICreate;
}): Promise<IRedditPlatformBan> {
  // Verify community and user exist
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) throw new HttpException("Community not found", 404);
  const user = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: props.userId },
  });
  if (!user) throw new HttpException("User not found", 404);
  // Verify user is not already banned
  const existingBan = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: {
      community_id_user_id: {
        community_id: props.communityId,
        user_id: props.userId,
      },
    },
  });
  if (existingBan) throw new HttpException("User is already banned", 409);
  // Create ban record using collector
  const created = await MyGlobal.prisma.reddit_platform_bans.create({
    data: await RedditPlatformBanCollector.collect({
      body: props.body,
      session: { id: props.member.session_id },
    }),
    ...RedditPlatformBanTransformer.select(),
  });
  // Transform to response DTO
  return await RedditPlatformBanTransformer.transform(created);
}
