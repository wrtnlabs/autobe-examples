import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";
import { IPageIRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePlatformSuspension";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditLikeAdminPlatformSuspensions(props: {
  admin: AdminPayload;
  body: IRedditLikePlatformSuspension.IRequest;
}): Promise<IPageIRedditLikePlatformSuspension> {
  const { body } = props;

  // Extract and validate pagination parameters with defaults
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  // Build WHERE clause with optional filters
  const whereCondition = {
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.is_permanent !== undefined && { is_permanent: body.is_permanent }),
  };

  // Execute parallel queries for data and total count
  const [suspensions, totalRecords] = await Promise.all([
    MyGlobal.prisma.reddit_like_platform_suspensions.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_platform_suspensions.count({
      where: whereCondition,
    }),
  ]);

  // Transform suspensions to API response format
  const transformedData: IRedditLikePlatformSuspension[] = suspensions.map(
    (suspension) => ({
      id: suspension.id,
      suspended_member_id: suspension.suspended_member_id,
      suspension_reason_category: suspension.suspension_reason_category,
      suspension_reason_text: suspension.suspension_reason_text,
      is_permanent: suspension.is_permanent,
      expiration_date: suspension.expiration_date
        ? toISOStringSafe(suspension.expiration_date)
        : undefined,
      is_active: suspension.is_active,
      created_at: toISOStringSafe(suspension.created_at),
    }),
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalRecords / limit);

  // Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages: totalPages,
    },
    data: transformedData,
  };
}
