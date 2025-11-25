import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommunitiesCommunityNameMemberships(props: {
  user: UserPayload;
  communityName: string;
  body: ICommunityPlatformCommunityMembership.IRequest;
}): Promise<IPageICommunityPlatformCommunityMembership.ISummary> {
  // 1. Find community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
    });
  if (!community) {
    throw new HttpException("Community not found.", 404);
  }

  // 2. Build where condition for filter
  const filter: Record<string, unknown> = {
    community_platform_community_id: community.id,
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    filter.status = props.body.status;
  }
  if (props.body.search) {
    filter.user = {
      is: {
        username: { contains: props.body.search, mode: "insensitive" },
      },
    };
  }

  // 3. Pagination, ordering
  const limit = props.body.limit ?? 100;
  const page = props.body.page ?? 0;
  const skip = page * limit;
  const orderByField =
    props.body.order_by === "updated_at" ? "updated_at" : "created_at";
  const orderDirection = props.body.order_direction === "asc" ? "asc" : "desc";

  // 4. Query membership records and count
  const [memberships, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_memberships.findMany({
      where: filter,
      include: {
        community: true,
        user: true,
        joinRequest: {
          include: {
            community: true,
            user: true,
            moderator: true,
          },
        },
      },
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_memberships.count({
      where: filter,
    }),
  ]);
  // 5. Map memberships to DTO
  const data = memberships.map((m) => ({
    id: m.id,
    community: m.community
      ? {
          id: m.community.id,
          name: m.community.name,
          display_title: m.community.display_title,
          description: m.community.description,
          visibility: m.community.visibility,
          image_url: m.community.image_url ?? undefined,
          status: m.community.status,
        }
      : undefined!,
    user: m.user ? { id: m.user.id } : undefined!,
    join_request:
      m.joinRequest && m.joinRequest.community && m.joinRequest.user
        ? {
            id: m.joinRequest.id,
            community: {
              id: m.joinRequest.community.id,
              name: m.joinRequest.community.name,
              display_title: m.joinRequest.community.display_title,
              description: m.joinRequest.community.description,
              visibility: m.joinRequest.community.visibility,
              image_url: m.joinRequest.community.image_url ?? undefined,
              status: m.joinRequest.community.status,
            },
            user: { id: m.joinRequest.user.id },
            moderator: m.joinRequest.moderator
              ? { id: m.joinRequest.moderator.id }
              : undefined,
            request_message: m.joinRequest.request_message ?? undefined,
            status: m.joinRequest.status,
            created_at: toISOStringSafe(m.joinRequest.created_at),
            processed_at:
              m.joinRequest.processed_at !== null &&
              m.joinRequest.processed_at !== undefined
                ? toISOStringSafe(m.joinRequest.processed_at)
                : null,
            updated_at: toISOStringSafe(m.joinRequest.updated_at),
            deleted_at:
              m.joinRequest.deleted_at !== null &&
              m.joinRequest.deleted_at !== undefined
                ? toISOStringSafe(m.joinRequest.deleted_at)
                : null,
          }
        : undefined,
    status: m.status,
    created_at: toISOStringSafe(m.created_at),
    updated_at: toISOStringSafe(m.updated_at),
    deleted_at:
      m.deleted_at !== null && m.deleted_at !== undefined
        ? toISOStringSafe(m.deleted_at)
        : null,
  }));

  // 6. Build page summary
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data,
  };
}
