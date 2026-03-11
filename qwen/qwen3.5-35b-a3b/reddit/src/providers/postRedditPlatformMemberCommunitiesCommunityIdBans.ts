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

export async function postRedditPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.ICreate;
}): Promise<IRedditPlatformCommunityBan> {
  // Check community exists and member is authorized (owner or moderator)
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      include: {
        owner: { select: { id: true } },
        moderators: { select: { id: true } },
      },
    });
  const isOwner = community.owner.id === props.member.id;
  const isModerator = community.moderators.some(
    (m) => m.id === props.member.id,
  );
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Check target user exists and is not self
  const targetUser =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.body.userId },
    });
  if (targetUser.id === props.member.id) {
    throw new HttpException("Cannot ban yourself", 400);
  }
  // Check for existing active ban (unique constraint: community_id + user_id)
  const existingBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.userId,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // Create ban record
  const created = await MyGlobal.prisma.reddit_platform_community_bans.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community: { connect: { id: props.communityId } },
      bannedUser: { connect: { id: props.body.userId } },
      bannedBy: { connect: { id: props.member.id } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expires_at: props.body.expiresAt ?? null,
    },
    ...RedditPlatformCommunityBanTransformer.select(),
  });
  return await RedditPlatformCommunityBanTransformer.transform(created);
}
