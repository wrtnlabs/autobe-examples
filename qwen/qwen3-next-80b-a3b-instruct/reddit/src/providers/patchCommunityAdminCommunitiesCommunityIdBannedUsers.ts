import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminCommunitiesCommunityIdBannedUsers(props: {
  admin: AdminPayload;
  communityId: string;
  body: ICommunityBannedUser.IRequest;
}): Promise<IPageICommunityBannedUser.ISummary> {
  const { body } = props;
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  const orderBy = { created_at: "desc" as const };
  const data = await MyGlobal.prisma.community_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      banned_user_id: true,
      banned_by_id: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community: { select: { id: true } },
      bannedUser: { select: { id: true } },
      bannedBy: { select: { id: true } },
    },
  });
  // Get karma scores for banned users using correct actor_id field
  const karmaScores = await MyGlobal.prisma.community_karma_scores.findMany({
    where: {
      actor_id: { in: data.map((item) => item.banned_user_id) },
      actor_type: "member",
      deleted_at: null,
    },
    select: {
      actor_id: true,
      karma_score: true,
    },
  });
  // Create a map of actor_id to karma_score
  const karmaMap: Record<string, number> = {};
  karmaScores.forEach((karma) => {
    karmaMap[karma.actor_id] = karma.karma_score;
  });
  // Get display_names and avatar_urls for banned users from community_members
  const bannedUserDetails = await MyGlobal.prisma.community_members.findMany({
    where: {
      id: { in: data.map((item) => item.banned_user_id) },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
    },
  });
  // Create a map of member id to profile details
  const userMap: Record<
    string,
    {
      display_name: string;
      avatar_url: string;
    }
  > = {};
  bannedUserDetails.forEach((user) => {
    userMap[user.id] = {
      display_name: user.display_name || "",
      avatar_url: user.avatar_url || "",
    };
  });
  // Get display_names of banning moderators from community_moderators
  const banningModeratorDetails =
    await MyGlobal.prisma.community_moderators.findMany({
      where: {
        id: { in: data.map((item) => item.banned_by_id) },
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
      },
    });
  // Create a map of moderator id to display_name
  const moderatorMap: Record<string, string> = {};
  banningModeratorDetails.forEach((moderator) => {
    moderatorMap[moderator.id] = moderator.display_name || "";
  });
  // Count total banned users
  const total = await MyGlobal.prisma.community_bans.count({ where });
  // Transform data to IPageICommunityBannedUser.ISummary format
  const transformedData = data.map((item) => {
    // Safe access to userMap properties with explicit null/undefined checks
    const user = userMap[item.banned_user_id];
    return {
      id: item.id,
      user_id: item.banned_user_id,
      display_name: user ? user.display_name : "",
      avatar_url: user ? user.avatar_url : "",
      reason: item.reason,
      created_at: toISOStringSafe(item.created_at),
      expires_at: null,
      banned_by_display_name: moderatorMap[item.banned_by_id] || "",
      karma_score: karmaMap[item.banned_user_id] || 0,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
