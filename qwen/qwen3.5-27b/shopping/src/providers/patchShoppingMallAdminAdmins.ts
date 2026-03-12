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
  // Verify admin exists and check grade level
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      grade: true,
    },
  });
  if (adminRecord === null || adminRecord.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters with defaults and validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_adminsWhereInput = {
    deleted_at: null,
  };
  // Apply search filter (email LIKE)
  if (props.body.search != null && props.body.search !== "") {
    whereInput.email = {
      contains: props.body.search,
    };
  }
  // Apply grade filter
  if (props.body.grade != null) {
    whereInput.grade = props.body.grade;
  }
  // Apply status filter
  if (props.body.status != null) {
    whereInput.status = props.body.status;
  }
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.shopping_mall_adminsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };
  // Fetch data with pagination
  const data = await MyGlobal.prisma.shopping_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAdminAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_admins.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallAdminAtSummaryTransformer.transform,
  );
  // Calculate pages, handle edge case where limit is 0
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: transformedData,
  };
}
