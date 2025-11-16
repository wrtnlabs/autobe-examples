import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorCommunitiesCommunityNameJoinRequests(props: {
  administrator: AdministratorPayload;
  communityName: string;
  body: ICommunityPlatformCommunityJoinRequest.IRequest;
}): Promise<IPageICommunityPlatformCommunityJoinRequest.ISummary> {
  const { communityName, body } = props;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: communityName, deleted_at: null, status: "active" },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const where: Record<string, any> = {
    community_platform_community_id: community.id,
    deleted_at: null,
    ...(body.status ? { status: body.status } : {}),
    ...(body.created_from ? { created_at: { gte: body.created_from } } : {}),
    ...(body.created_to
      ? {
          created_at: {
            ...(body.created_from ? { gte: body.created_from } : {}),
            lte: body.created_to,
          },
        }
      : {}),
  };
  const include = { user: true, moderator: true, community: true };
  if (body.applicant_search) {
    where.user = { id: { contains: body.applicant_search } };
  }
  if (body.moderator_search) {
    where.moderator = { id: { contains: body.moderator_search } };
  }
  const orderBy = [
    body.order_by === "status"
      ? {
          status:
            body.order_direction === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        }
      : {
          created_at:
            body.order_direction === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        },
  ];
  const skip = (body.page - 1) * body.limit;
  const take = body.limit;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_join_requests.findMany({
      where,
      include,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_community_join_requests.count({ where }),
  ]);
  return {
    pagination: {
      current: body.page,
      limit: body.limit,
      records: total,
      pages: Math.ceil(total / body.limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      community: {
        id: community.id,
        name: community.name,
        display_title: community.display_title,
        description: community.description,
        visibility: community.visibility,
        image_url: community.image_url === null ? null : community.image_url,
        status: community.status,
      },
      user: { id: row.user_id },
      moderator:
        row.processed_by_moderator_id && row["moderator"]
          ? { id: row.processed_by_moderator_id }
          : undefined,
      request_message: row.request_message ?? undefined,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      processed_at: row.processed_at ? toISOStringSafe(row.processed_at) : null,
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
