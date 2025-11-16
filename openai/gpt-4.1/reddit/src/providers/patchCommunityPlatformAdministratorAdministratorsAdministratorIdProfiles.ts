import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageISorting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISorting";
import { ISorting } from "@ORGANIZATION/PROJECT-api/lib/structures/ISorting";
import { IPageICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdministratorProfile";
import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorAdministratorsAdministratorIdProfiles(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdministratorProfile.IRequest;
}): Promise<IPageICommunityPlatformAdministratorProfile.ISummary> {
  // Authorization context is already enforced by decorator, but validate administratorId matches caller (for context correctness.)
  if (props.administrator.id !== props.administratorId) {
    throw new HttpException("Administrator context mismatch.", 403);
  }

  // Destructure filters and pagination
  const {
    display_username,
    status,
    created_from,
    created_to,
    search,
    pagination,
    sorting,
  } = props.body || {};

  const page = pagination?.current ?? 1;
  const limit = pagination?.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build Prisma where filter
  const where: Record<string, any> = {};

  if (display_username !== undefined) {
    where.display_username = {
      contains: display_username,
      mode: "insensitive",
    };
  }
  if (status !== undefined) {
    where.status = status;
  }
  if (created_from !== undefined || created_to !== undefined) {
    where.created_at = {};
    if (created_from !== undefined) where.created_at.gte = created_from;
    if (created_to !== undefined) where.created_at.lte = created_to;
  }
  if (search !== undefined) {
    where.OR = [
      { display_username: { contains: search, mode: "insensitive" } },
      { bio: { contains: search, mode: "insensitive" } },
      { status: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sort
  let orderBy: Array<Record<string, "asc" | "desc">> = [{ created_at: "desc" }];
  if (sorting && Array.isArray(sorting.data) && sorting.data.length > 0) {
    orderBy = sorting.data.map((sort: ISorting) => ({
      [sort.orderBy]: sort.direction,
    }));
  }

  // Parallel query: get paginated data and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_administrator_profiles.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        administrator: {
          select: { id: true },
        },
      },
    }),
    MyGlobal.prisma.community_platform_administrator_profiles.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((profile) => ({
      id: profile.id,
      display_username: profile.display_username,
      avatar_uri: profile.avatar_uri === null ? null : profile.avatar_uri,
      status: profile.status,
      administrator: { id: profile.administrator.id },
      created_at: toISOStringSafe(profile.created_at),
      updated_at: toISOStringSafe(profile.updated_at),
    })),
  };
}
