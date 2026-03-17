import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformAdminAtSummaryTransformer } from "../transformers/CommunityPlatformAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdmins(props: {
  body: ICommunityPlatformAdmin.IRequest;
}): Promise<IPageICommunityPlatformAdmin.ISummary> {
  // Authorization check - only administrators can access this endpoint
  // Note: Authorization would be handled by middleware, but we'll keep the structure
  // Set default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate pagination bounds
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Build WHERE clause with filters
  const whereInput = {
    ...(props.body.include_deleted !== true && { deleted_at: null }),
    ...(props.body.search && {
      email: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.start_created_at && {
      created_at: {
        gte: new Date(props.body.start_created_at),
      },
    }),
    ...(props.body.end_created_at && {
      created_at: {
        lte: new Date(props.body.end_created_at),
      },
    }),
  } satisfies Prisma.community_platform_adminsWhereInput;
  // Execute queries sequentially (not in parallel for better error handling)
  const data = await MyGlobal.prisma.community_platform_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityPlatformAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_admins.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformAdminAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
