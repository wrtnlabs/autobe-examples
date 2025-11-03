import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import { IPageIShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductApproval";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductApprovals(props: {
  admin: AdminPayload;
  body: IShoppingMallProductApproval.IRequest;
}): Promise<IPageIShoppingMallProductApproval.ISummary> {
  const { body } = props;

  // Set defaults for pagination if undefined
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  // Build where clause with filters and exclude soft deleted
  const where = {
    deleted_at: null,
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && {
        shopping_mall_admin_id: body.admin_id,
      }),
  };

  // Validate sort field and order
  const validSortFields = ["created_at", "updated_at", "status"];
  const sortField = validSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Fetch data and total count concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_approvals.findMany({
      where,
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_admin_id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_approvals.count({
      where,
    }),
  ]);

  // Map results to API return type without type assertions
  const mappedData: IShoppingMallProductApproval.ISummary[] = data.map(
    (record) => {
      // Map status explicitly to allowed literals
      const status =
        record.status === "pending" ||
        record.status === "approved" ||
        record.status === "rejected"
          ? record.status
          : "pending";

      return {
        id: record.id,
        shopping_mall_product_id: record.shopping_mall_product_id,
        shopping_mall_admin_id: record.shopping_mall_admin_id,
        status,
        reason: record.reason ?? null,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
      };
    },
  );

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
