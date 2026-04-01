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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAtSummaryTransformer } from "../transformers/ShoppingMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  // Fetch admin record to check grade
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.admin.id,
    },
    select: {
      grade: true,
    },
  });
  // Validate super admin grade
  if (adminRecord?.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_adminsWhereInput = {
    deleted_at: null,
  };
  // Apply grade filter if provided
  if (props.body.grade !== null && props.body.grade !== undefined) {
    whereInput.grade = props.body.grade;
  }
  // Apply status filter if provided
  if (props.body.status !== null && props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Apply email search if provided
  if (props.body.search !== null && props.body.search !== undefined) {
    whereInput.email = {
      contains: props.body.search,
    };
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.shopping_mall_adminsOrderByWithRelationInput =
    props.body.sortBy !== null && props.body.sortBy !== undefined
      ? {
          [props.body.sortBy]: props.body.sortOrder ?? "desc",
        }
      : {
          created_at: "desc" as const,
        };
  // Execute query
  const data = await MyGlobal.prisma.shopping_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAdminAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_admins.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallAdminAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: transformedData,
  };
}
