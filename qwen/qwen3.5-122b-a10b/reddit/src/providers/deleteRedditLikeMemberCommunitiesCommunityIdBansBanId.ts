import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date();
  // Verify community exists
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Verify member is owner or moderator
  const isOwner = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.communityId,
      owner_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!isOwner) {
    const isModerator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_id: props.communityId,
          reddit_like_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Verify ban exists and belongs to this community
  const ban =
    await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        community_id: true,
        deleted_at: true,
      },
    });
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Forbidden", 403);
  }
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban is already removed", 400);
  }
  // Soft delete the ban
  await MyGlobal.prisma.reddit_like_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
