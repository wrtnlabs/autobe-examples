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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorProfiles(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformProfile.IRequest;
}): Promise<IPageICommunityPlatformProfile> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build Prisma where condition
  const where = {
    ...(body.profileId !== undefined &&
      body.profileId !== null && {
        id: body.profileId,
      }),
    ...(body.username !== undefined && {
      username: { contains: body.username },
    }),
    ...(body.bio !== undefined && {
      bio: { contains: body.bio },
    }),
    ...(body.statusMessage !== undefined && {
      status_message: { contains: body.statusMessage },
    }),
    ...(body.isPublic !== undefined && {
      is_public: body.isPublic,
    }),
    ...((body.createdAfter !== undefined ||
      body.createdBefore !== undefined) && {
      created_at: {
        ...(body.createdAfter !== undefined && {
          gte: toISOStringSafe(body.createdAfter),
        }),
        ...(body.createdBefore !== undefined && {
          lte: toISOStringSafe(body.createdBefore),
        }),
      },
    }),
    ...((body.updatedAfter !== undefined ||
      body.updatedBefore !== undefined) && {
      updated_at: {
        ...(body.updatedAfter !== undefined && {
          gte: toISOStringSafe(body.updatedAfter),
        }),
        ...(body.updatedBefore !== undefined && {
          lte: toISOStringSafe(body.updatedBefore),
        }),
      },
    }),
  };

  // OrderBy logic (must be inline for type safety)
  const orderBy =
    body.sortBy === "username"
      ? {
          username:
            body.sortOrder === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        }
      : body.sortBy === "updated_at"
        ? {
            updated_at:
              body.sortOrder === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc,
          }
        : {
            created_at:
              body.sortOrder === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc,
          };

  // Query for results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_profiles.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_profiles.count({ where }),
  ]);

  // Map Prisma records to API type, redacting private profile fields
  const data = rows.map((row) => {
    const isPublic = row.is_public === true;
    return {
      id: row.id,
      community_platform_member_id: row.community_platform_member_id,
      username: row.username,
      bio: isPublic ? (row.bio ?? null) : null,
      avatar_uri: isPublic ? (row.avatar_uri ?? null) : null,
      display_email: isPublic ? (row.display_email ?? null) : null,
      status_message: row.status_message ?? null,
      is_public: row.is_public,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
