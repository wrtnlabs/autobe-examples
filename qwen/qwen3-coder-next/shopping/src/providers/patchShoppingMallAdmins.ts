import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdmins(props: {
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const where: Prisma.shopping_mall_adminsWhereInput = {};
  // Filter by role grade if provided
  if (props.body.role_grade !== undefined) {
    where.role_grade = props.body.role_grade;
  }
  // Filter by created_at date range if provided
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined) {
      where.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      where.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // Filter by soft deletion status
  if (props.body.deleted_at_status === "active") {
    where.deleted_at = null;
  } else if (props.body.deleted_at_status === "deleted") {
    where.deleted_at = { not: null };
  }
  // If "all", don't filter by deleted_at
  // Build order by clause
  const orderBy: Prisma.Enumerable<Prisma.shopping_mall_adminsOrderByWithRelationInput> =
    [];
  if (props.body.sort_by === "created_at") {
    orderBy.push({ created_at: props.body.sort_order ?? "desc" });
  } else if (props.body.sort_by === "updated_at") {
    orderBy.push({ updated_at: props.body.sort_order ?? "desc" });
  } else if (props.body.sort_by === "role_grade") {
    orderBy.push({ role_grade: props.body.sort_order ?? "asc" });
  } else {
    // Default sort by created_at descending
    orderBy.push({ created_at: "desc" });
  }
  // Execute query
  const data = await MyGlobal.prisma.shopping_mall_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      role_grade: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_admins.count({ where });
  // Transform data to response format
  const transformedData: IShoppingMallAdmin.ISummary[] = data.map((admin) => ({
    id: admin.id as string & tags.Format<"uuid">,
    user: {
      id: admin.id as string & tags.Format<"uuid">,
      email: admin.email,
    } satisfies IShoppingMallAdmin.ISummaryUser,
    reason: "",
    status: "pending" as const,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallAdmin.ISummary;
}
