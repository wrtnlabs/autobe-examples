import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string;
}): Promise<IPageIRedditCloneCommunityBan.ISummary> {
  const page = 1; // Default page
  const limit = 20; // Default page size
  const skip = (page - 1) * limit;
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
  } satisfies Prisma.reddit_clone_community_bansWhereInput;
  const data = await MyGlobal.prisma.reddit_clone_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      ban_start_date: "desc",
    },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      moderator_id: true,
      ban_reason: true,
      ban_start_date: true,
      ban_end_date: true,
      appeal_status: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      moderator: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          role_type: true,
          permissions: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          last_login_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_community_bans.count({
    where: whereInput,
  });
  const formattedData: IRedditCloneCommunityBan.ISummary[] = data.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      user: {
        id: record.user.id as string & tags.Format<"uuid">,
        username: record.user.username,
        displayName: record.user.display_name ?? null,
        avatarUrl: record.user.avatar_url ?? null,
      } satisfies IRedditCloneMember.ISummary,
      moderator: {
        id: record.moderator.id as string & tags.Format<"uuid">,
        email: record.moderator.email,
        username: record.moderator.username,
        displayName: record.moderator.display_name ?? null,
        bio: record.moderator.bio ?? null,
        avatarUrl: record.moderator.avatar_url ?? null,
        roleType: record.moderator.role_type,
        permissions: record.moderator.permissions,
        createdAt: record.moderator.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updatedAt: record.moderator.updated_at.toISOString() as string &
          tags.Format<"date-time">,
        deletedAt: record.moderator.deleted_at
          ? (record.moderator.deleted_at.toISOString() as string &
              tags.Format<"date-time">)
          : null,
        lastLoginAt: record.moderator.last_login_at
          ? (record.moderator.last_login_at.toISOString() as string &
              tags.Format<"date-time">)
          : null,
      } satisfies IRedditCloneModerator.ISummary,
      banReason: record.ban_reason,
      banStartDate: record.ban_start_date.toISOString() as string &
        tags.Format<"date-time">,
      banEndDate: record.ban_end_date
        ? (record.ban_end_date.toISOString() as string &
            tags.Format<"date-time">)
        : null,
      appealStatus: record.appeal_status as "pending" | "approved" | "denied",
      createdAt: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: record.updated_at
        ? (record.updated_at.toISOString() as string & tags.Format<"date-time">)
        : null,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: formattedData,
  };
}
