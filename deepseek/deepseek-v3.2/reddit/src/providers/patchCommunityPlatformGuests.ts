import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformGuestAtSummaryTransformer } from "../transformers/CommunityPlatformGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuests(props: {
  body: ICommunityPlatformGuest.IRequest;
}): Promise<IPageICommunityPlatformGuest.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with independent date filters
  const whereConditions: Prisma.community_platform_guestsWhereInput = {};
  // Search filter - case-insensitive partial match
  if (props.body.search !== undefined) {
    whereConditions.anonymous_id = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Exact anonymous_id filter
  if (props.body.anonymous_id !== undefined) {
    whereConditions.anonymous_id = props.body.anonymous_id;
  }
  // Created_at date range filtering (independent start/end)
  const createdAtConditions: Prisma.DateTimeFilter = {};
  if (props.body.created_at_start !== undefined) {
    createdAtConditions.gte = new Date(props.body.created_at_start);
  }
  if (props.body.created_at_end !== undefined) {
    createdAtConditions.lte = new Date(props.body.created_at_end);
  }
  if (Object.keys(createdAtConditions).length > 0) {
    whereConditions.created_at = createdAtConditions;
  }
  // Updated_at date range filtering (independent start/end)
  const updatedAtConditions: Prisma.DateTimeFilter = {};
  if (props.body.updated_at_start !== undefined) {
    updatedAtConditions.gte = new Date(props.body.updated_at_start);
  }
  if (props.body.updated_at_end !== undefined) {
    updatedAtConditions.lte = new Date(props.body.updated_at_end);
  }
  if (Object.keys(updatedAtConditions).length > 0) {
    whereConditions.updated_at = updatedAtConditions;
  }
  // Validate date ranges when both start and end are provided
  if (
    props.body.created_at_start !== undefined &&
    props.body.created_at_end !== undefined &&
    new Date(props.body.created_at_start) > new Date(props.body.created_at_end)
  ) {
    throw new HttpException(
      "created_at_start must be less than or equal to created_at_end",
      400,
    );
  }
  if (
    props.body.updated_at_start !== undefined &&
    props.body.updated_at_end !== undefined &&
    new Date(props.body.updated_at_start) > new Date(props.body.updated_at_end)
  ) {
    throw new HttpException(
      "updated_at_start must be less than or equal to updated_at_end",
      400,
    );
  }
  // Build ORDERBY with defaults
  const orderByInput = (
    props.body.sort === "updated_at"
      ? { updated_at: (props.body.order ?? "desc") as "asc" | "desc" }
      : { created_at: (props.body.order ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.community_platform_guestsOrderByWithRelationInput;
  // Execute queries sequentially (not Promise.all)
  const data = await MyGlobal.prisma.community_platform_guests.findMany({
    where: whereConditions,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPlatformGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_guests.count({
    where: whereConditions,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformGuestAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
