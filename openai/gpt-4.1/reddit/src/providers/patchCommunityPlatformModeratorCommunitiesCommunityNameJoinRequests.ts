import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import { IPageICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityJoinRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorCommunitiesCommunityNameJoinRequests(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: ICommunityPlatformCommunityJoinRequest.IRequest;
}): Promise<IPageICommunityPlatformCommunityJoinRequest.ISummary> {
  // 1. Find target community (must exist, not deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.communityName, deleted_at: null },
    });
  if (!community) throw new HttpException("Community not found", 404);

  // 2. Pagination background
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // 3. Build join request filters
  const filters: Record<string, any> = {
    community_platform_community_id: community.id,
    deleted_at: null,
  };
  if (props.body.status) filters.status = props.body.status;
  if (props.body.created_from)
    filters.created_at = {
      ...filters.created_at,
      gte: props.body.created_from,
    };
  if (props.body.created_to)
    filters.created_at = { ...filters.created_at, lte: props.body.created_to };
  // Text search (applicant_search)
  if (props.body.applicant_search) {
    filters.user = {
      ...(filters.user || {}),
      OR: [
        {
          email: { contains: props.body.applicant_search, mode: "insensitive" },
        },
      ],
    };
  }
  // Text search (moderator_search)
  if (props.body.moderator_search) {
    filters.moderator = {
      ...(filters.moderator || {}),
      OR: [
        {
          email: { contains: props.body.moderator_search, mode: "insensitive" },
        },
      ],
    };
  }

  // 4. Sorting
  let orderBy: any = { created_at: "desc" };
  if (props.body.order_by && props.body.order_direction) {
    orderBy = { [props.body.order_by]: props.body.order_direction };
  }

  // 5. Query w/ count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_join_requests.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
        moderator: true,
        community: true,
      },
    }),
    MyGlobal.prisma.community_platform_community_join_requests.count({
      where: filters,
    }),
  ]);

  // 6. Map to DTO
  return {
    data: rows.map((row) => ({
      id: row.id,
      community: {
        id: row.community.id,
        name: row.community.name,
        display_title: row.community.display_title,
        description: row.community.description,
        visibility: row.community.visibility,
        image_url: row.community.image_url ?? undefined,
        status: row.community.status,
      },
      user: {
        id: row.user.id,
      },
      moderator: row.moderator ? { id: row.moderator.id } : undefined,
      request_message: row.request_message ?? undefined,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      processed_at: row.processed_at
        ? toISOStringSafe(row.processed_at)
        : undefined,
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
