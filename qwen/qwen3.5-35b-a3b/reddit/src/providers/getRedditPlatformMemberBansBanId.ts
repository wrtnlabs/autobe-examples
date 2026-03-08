import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityBan> {
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...RedditPlatformCommunityBanTransformer.select(),
    });
  const isOwner = ban.community.owner.id === props.member.id;
  const isBanningModerator = ban.bannedBy.id === props.member.id;
  const isCommunityModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: ban.community.id,
        user_id: props.member.id,
      },
    });
  if (!isOwner && !isBanningModerator && !isCommunityModerator) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformCommunityBanTransformer.transform(ban);
}
