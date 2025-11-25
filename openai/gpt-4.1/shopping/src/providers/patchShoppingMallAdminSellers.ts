import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  // Extract query params
  const {
    email,
    business_name,
    registration_number,
    status,
    is_email_verified,
    created_from,
    created_to,
    updated_from,
    updated_to,
    sort_by,
    sort_direction,
    page,
    page_size,
  } = props.body ?? {};

  // Build the Prisma where clause, using only provided filters
  const where = {
    ...(email !== undefined && email !== null && email !== ""
      ? {
          email: {
            contains: email satisfies string as string,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(business_name !== undefined &&
    business_name !== null &&
    business_name !== ""
      ? {
          business_name: {
            contains: business_name,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(registration_number !== undefined &&
    registration_number !== null &&
    registration_number !== ""
      ? { registration_number: registration_number }
      : {}),
    ...(status !== undefined && status !== null && status !== ""
      ? { status: status }
      : {}),
    ...(is_email_verified !== undefined && is_email_verified !== null
      ? { is_email_verified: is_email_verified }
      : {}),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from ? { gte: toISOStringSafe(created_from) } : {}),
            ...(created_to ? { lte: toISOStringSafe(created_to) } : {}),
          },
        }
      : {}),
    ...(updated_from || updated_to
      ? {
          updated_at: {
            ...(updated_from ? { gte: toISOStringSafe(updated_from) } : {}),
            ...(updated_to ? { lte: toISOStringSafe(updated_to) } : {}),
          },
        }
      : {}),
  };

  // Sorting: Only allow by whitelisted fields for security
  const allowedSortFields = [
    "business_name",
    "email",
    "status",
    "created_at",
    "updated_at",
  ];
  const sortField =
    sort_by && allowedSortFields.includes(sort_by) ? sort_by : "created_at";
  const sortOrder =
    sort_direction === "asc" || sort_direction === "desc"
      ? sort_direction
      : "desc";

  // Pagination
  const currentPage = page && page > 0 ? page : 1;
  const limit = page_size && page_size > 0 && page_size <= 100 ? page_size : 20;
  const skip = (currentPage - 1) * limit;

  // Query
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      select: {
        id: true,
        business_name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  // Build data list
  const data = records.map((record) => ({
    id: record.id,
    business_name: record.business_name,
  }));

  return {
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
