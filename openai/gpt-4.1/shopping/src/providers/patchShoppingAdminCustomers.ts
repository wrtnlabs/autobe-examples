import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IPageIShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingCustomer.IRequest;
}): Promise<IPageIShoppingCustomer.ISummary> {
  const {
    page,
    limit,
    search,
    is_active,
    sort_by,
    sort_order,
    created_at_from,
    created_at_to,
  } = props.body;

  // Where clause construction
  const where = {
    ...(search
      ? {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        }
      : {}),
    ...(is_active !== undefined ? { is_active } : {}),
    ...(created_at_from || created_at_to
      ? {
          created_at: {
            ...(created_at_from ? { gte: created_at_from } : {}),
            ...(created_at_to ? { lte: created_at_to } : {}),
          },
        }
      : {}),
  };

  // Allowed sort fields and direction
  const allowedSortFields = ["name", "created_at", "email", "is_active"];
  const sortField = allowedSortFields.includes(sort_by || "")
    ? sort_by
    : "created_at";
  const sortDirection = sort_order === "desc" ? "desc" : "asc";

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

  // Query DB
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_customers.findMany({
      where,
      orderBy: { [sortField!]: sortDirection },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_customers.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  const pages = Math.ceil(total / limitNum);
  const pagination = {
    current: pageNum,
    limit: limitNum,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
