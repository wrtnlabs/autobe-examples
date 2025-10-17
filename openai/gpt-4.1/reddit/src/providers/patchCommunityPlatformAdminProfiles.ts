import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IPageICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminProfiles(props: {
  admin: AdminPayload;
  body: ICommunityPlatformProfile.IRequest;
}): Promise<IPageICommunityPlatformProfile> {
  // Extract filters and pagination parameters from request
  const {
    profileId,
    username,
    bio,
    statusMessage,
    isPublic,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    sortBy,
    sortOrder,
    page,
    limit,
  } = props.body;

  // Pagination with constraints
  const currentPage = typeof page === "number" && page >= 1 ? page : 1;
  const take =
    typeof limit === "number" && limit >= 1 && limit <= 100 ? limit : 20;
  const skip = (currentPage - 1) * take;

  // Enforce sort field and direction
  const allowedSortFields = ["created_at", "updated_at", "username"];
  const orderField = allowedSortFields.includes(sortBy ?? "")
    ? sortBy!
    : "created_at";
  const orderDirection = sortOrder === "asc" ? "asc" : "desc";

  // Build Prisma where clause
  const where = {
    ...(profileId !== undefined &&
      profileId !== null && {
        id: profileId,
      }),
    ...(username !== undefined &&
      username !== null && {
        username: {
          contains: username,
        },
      }),
    ...(bio !== undefined &&
      bio !== null && {
        bio: {
          contains: bio,
        },
      }),
    ...(statusMessage !== undefined &&
      statusMessage !== null && {
        status_message: statusMessage,
      }),
    ...(isPublic !== undefined &&
      isPublic !== null && {
        is_public: isPublic,
      }),
    ...((createdAfter !== undefined && createdAfter !== null) ||
    (createdBefore !== undefined && createdBefore !== null)
      ? {
          created_at: {
            ...(createdAfter !== undefined &&
              createdAfter !== null && {
                gte: createdAfter,
              }),
            ...(createdBefore !== undefined &&
              createdBefore !== null && {
                lte: createdBefore,
              }),
          },
        }
      : {}),
    ...((updatedAfter !== undefined && updatedAfter !== null) ||
    (updatedBefore !== undefined && updatedBefore !== null)
      ? {
          updated_at: {
            ...(updatedAfter !== undefined &&
              updatedAfter !== null && {
                gte: updatedAfter,
              }),
            ...(updatedBefore !== undefined &&
              updatedBefore !== null && {
                lte: updatedBefore,
              }),
          },
        }
      : {}),
  };

  // Query results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_profiles.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_profiles.count({ where }),
  ]);

  // Format result profiles as ICommunityPlatformProfile
  const profiles = rows.map((r) => ({
    id: r.id,
    community_platform_member_id: r.community_platform_member_id,
    username: r.username,
    bio: r.bio ?? undefined,
    avatar_uri: r.avatar_uri ?? undefined,
    display_email: r.display_email ?? undefined,
    status_message: r.status_message ?? undefined,
    is_public: r.is_public,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(take),
      records: total,
      pages: Math.ceil(total / take),
    },
    data: profiles,
  };
}
