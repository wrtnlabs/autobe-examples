import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationBan";
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

export async function patchCommunityPlatformAdminBans(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationBan.IRequest;
}): Promise<IPageICommunityPlatformModerationBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.duration && { duration: { contains: props.body.duration } }),
  } satisfies Prisma.community_platform_moderation_bansWhereInput;
  // Perform database query using select
  const data =
    await MyGlobal.prisma.community_platform_moderation_bans.findMany({
      where,
      skip,
      take: limit,
      orderBy: { started_at: "desc" },
      select: {
        id: true,
        reason: true,
        duration: true,
        started_at: true,
        ends_at: true,
        created_at: true,
        updated_at: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {},
            },
          },
        },
        user: {
          select: {},
        },
        moderator: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  // Get the total count for pagination
  const total = await MyGlobal.prisma.community_platform_moderation_bans.count({
    where,
  });
  // Manually transform results
  const transformedData = data.map((ban) => ({
    id: ban.id,
    reason: ban.reason,
    duration: ban.duration,
    started_at: toISOStringSafe(ban.started_at),
    ends_at: ban.ends_at ? toISOStringSafe(ban.ends_at) : null,
    created_at: toISOStringSafe(ban.created_at),
    updated_at: toISOStringSafe(ban.updated_at),
    community: {
      id: ban.community.id,
      name: ban.community.name,
      description: ban.community.description,
      icon_url: ban.community.icon_url,
      created_at: toISOStringSafe(ban.community.created_at),
      updated_at: toISOStringSafe(ban.community.updated_at),
      deleted_at: ban.community.deleted_at
        ? toISOStringSafe(ban.community.deleted_at)
        : null,
      owner: {},
    },
    user: {},
    moderator: {
      id: ban.moderator.id,
      email: ban.moderator.email,
      created_at: toISOStringSafe(ban.moderator.created_at),
      updated_at: toISOStringSafe(ban.moderator.updated_at),
    },
  }));
  // Return the paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as IPage.IPagination,
  } as IPageICommunityPlatformModerationBan.ISummary;
}
