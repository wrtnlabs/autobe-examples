import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IPageIShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingSeller.IRequest;
}): Promise<IPageIShoppingSeller.ISummary> {
  const { body } = props;
  // Pagination params (default page 1, limit 20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build filters
  const where: Record<string, unknown> = { deleted_at: null };

  if (body.status) {
    where.status = body.status;
  }

  // Date range for created_at
  if (body.created_from || body.created_to) {
    where.created_at = {
      ...(body.created_from && { gte: body.created_from }),
      ...(body.created_to && { lte: body.created_to }),
    };
  }
  // Date range for updated_at
  if (body.updated_from || body.updated_to) {
    where.updated_at = {
      ...(body.updated_from && { gte: body.updated_from }),
      ...(body.updated_to && { lte: body.updated_to }),
    };
  }

  // Search: display_name, email, contact_phone (case-insensitive partial match)
  const searchText = body.search?.trim();
  if (searchText && searchText.length > 0) {
    where.OR = [
      { display_name: { contains: searchText } },
      { email: { contains: searchText } },
      { contact_phone: { contains: searchText } },
    ];
  }

  // Sorting
  let orderBy;
  if (
    body.sort_by === "created_at" ||
    body.sort_by === "display_name" ||
    body.sort_by === "status"
  ) {
    orderBy = {
      [body.sort_by]: (body.sort_order === "asc"
        ? "asc"
        : "desc") as Prisma.SortOrder,
    };
  } else {
    orderBy = { created_at: "desc" as Prisma.SortOrder };
  }

  // Query sellers & count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_sellers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        display_name: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_sellers.count({ where }),
  ]);

  // Map to ISummary structure
  const data = rows.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    status: row.status,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
