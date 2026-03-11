import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformCommunityModeratorDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorDetail";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.IAssignment;
}): Promise<IRedditPlatformCommunityModerator.IListResponse> {
  const { member, communityId, body } = props;
  const { actionType, targetUserId, notes } = body;
  if (actionType !== "ADD" && actionType !== "REMOVE") {
    throw new HttpException("Invalid action type", 400);
  }
  if (typeof targetUserId !== "string") {
    throw new HttpException("Invalid target user ID", 400);
  }
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: communityId,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const isOwner = community.owner_id === member.id;
  const isModerator = await MyGlobal.prisma.reddit_platform_community_moderators
    .findFirst({
      where: {
        community_id: communityId,
        user_id: member.id,
      },
    })
    .then((r): boolean => r !== null);
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      id: targetUserId,
      deleted_at: null,
    },
  });
  if (targetMember === null) {
    throw new HttpException("Target user not found", 404);
  }
  if (targetMember.id === community.owner_id) {
    throw new HttpException("Cannot add or remove community owner", 409);
  }
  if (actionType === "ADD") {
    const existingModerator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: communityId,
          user_id: targetUserId,
        },
      });
    if (existingModerator !== null) {
      throw new HttpException("User is already a moderator", 409);
    }
    const moderatorId: string & tags.Format<"uuid"> = v4() as string &
      tags.Format<"uuid">;
    await MyGlobal.prisma.reddit_platform_community_moderators.create({
      data: {
        id: moderatorId,
        community_id: communityId,
        user_id: targetUserId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const auditLogId: string & tags.Format<"uuid"> = v4() as string &
      tags.Format<"uuid">;
    await MyGlobal.prisma.reddit_platform_moderator_histories.create({
      data: {
        id: auditLogId,
        community_id: communityId,
        user_id: member.id,
        action_type: "APPOINTED" as const,
        notes: notes ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  if (actionType === "REMOVE") {
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: communityId,
          user_id: targetUserId,
        },
      });
    if (moderator === null) {
      throw new HttpException("User is not a moderator", 404);
    }
    if (targetUserId === member.id) {
      throw new HttpException("Cannot remove self", 409);
    }
    await MyGlobal.prisma.reddit_platform_community_moderators.delete({
      where: {
        id: moderator.id,
      },
    });
    const auditLogId: string & tags.Format<"uuid"> = v4() as string &
      tags.Format<"uuid">;
    await MyGlobal.prisma.reddit_platform_moderator_histories.create({
      data: {
        id: auditLogId,
        community_id: communityId,
        user_id: member.id,
        action_type: "REMOVED" as const,
        notes: notes ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  const moderators =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        community_id: communityId,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        },
      },
    });
  const transformedModerators: IRedditPlatformCommunityModeratorDetail[] =
    await ArrayUtil.asyncMap(moderators, async (mod) => {
      const moderatorDetail: IRedditPlatformCommunityModeratorDetail = {
        id: mod.id,
        created_at: toISOStringSafe(mod.created_at),
        updated_at: toISOStringSafe(mod.updated_at),
        user: {
          id: mod.user.id,
          username: mod.user.username,
          display_name: mod.user.display_name,
          karma_score: Number(mod.user.karma_score),
          is_active: mod.user.is_active,
          created_at: toISOStringSafe(mod.user.created_at),
        },
      };
      return moderatorDetail;
    });
  const response: IRedditPlatformCommunityModerator.IListResponse = {
    moderators: transformedModerators,
  };
  return response;
}
