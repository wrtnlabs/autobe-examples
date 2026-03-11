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

export async function postRedditPlatformMemberCommunitiesCommunityIdBansUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.ICreate;
}): Promise<IRedditPlatformCommunityBan> {
  const { member, communityId, userId, body } = props;
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: communityId, deleted_at: null },
  });
  await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
    where: { id: userId, deleted_at: null },
  });
  const existingBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: communityId,
        user_id: userId,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 400);
  }
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: communityId,
        user_id: member.id,
      },
    });
  if (moderator === null) {
    throw new HttpException(
      "You do not have moderation privileges in this community",
      403,
    );
  }
  const created = await MyGlobal.prisma.reddit_platform_community_bans.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community: { connect: { id: communityId } },
      bannedUser: { connect: { id: userId } },
      bannedBy: { connect: { id: member.id } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expires_at: body.expiresAt ?? null,
    },
    ...RedditPlatformCommunityBanTransformer.select(),
  });
  return await RedditPlatformCommunityBanTransformer.transform(created);
}
