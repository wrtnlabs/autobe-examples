import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
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

export async function patchCommunityPlatformAdminReportCategories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReportCategory;
}): Promise<IPageICommunityPlatformReportCategory> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.community_platform_report_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.name && { name: props.body.name }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name },
    }),
    ...(props.body.severity_level && {
      severity_level: props.body.severity_level,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.created_at_from &&
      props.body.created_at_to && {
        created_at: {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.search && {
      OR: [
        { display_name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.community_platform_report_categoriesOrderByWithRelationInput =
    props.body.sort_by === "name"
      ? { name: props.body.sort_order ?? "asc" }
      : props.body.sort_by === "severity_level"
        ? { severity_level: props.body.sort_order ?? "desc" }
        : { created_at: props.body.sort_order ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_report_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    }),
    MyGlobal.prisma.community_platform_report_categories.count({
      where: whereInput,
    }),
  ]);
  // Transform database records to response DTO
  const transformedData: ICommunityPlatformReportCategory[] = data.map(
    (item) => ({
      ...(props.body.search && { search: props.body.search }),
      ...(props.body.name && { name: props.body.name }),
      ...(props.body.display_name && { display_name: props.body.display_name }),
      ...(props.body.severity_level && {
        severity_level: props.body.severity_level,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      ...(props.body.created_at_from && {
        created_at_from: props.body.created_at_from,
      }),
      ...(props.body.created_at_to && {
        created_at_to: props.body.created_at_to,
      }),
      ...(props.body.page && { page: props.body.page }),
      ...(props.body.limit && { limit: props.body.limit }),
      ...(props.body.sort_by && { sort_by: props.body.sort_by }),
      ...(props.body.sort_order && { sort_order: props.body.sort_order }),
    }),
  );
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
