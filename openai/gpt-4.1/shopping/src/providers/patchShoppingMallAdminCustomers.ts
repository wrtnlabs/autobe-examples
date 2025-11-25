import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const input = props.body;
  const page = input.page && input.page >= 1 ? input.page : 1;
  // Default limit to 100 if missing/invalid
  let rawLimit = 100;
  if (typeof input.limit === "number" && input.limit >= 1 && input.limit <= 100)
    rawLimit = input.limit;
  else if (typeof input.limit === "number" && input.limit > 100) rawLimit = 100;

  const take = rawLimit;
  const skip = (page - 1) * take;

  // Build where
  const where: Record<string, any> = {};
  if (input.email) {
    where.email = { contains: input.email, mode: "insensitive" };
  }
  if (input.name) {
    where.name = { contains: input.name, mode: "insensitive" };
  }
  if (input.phone) {
    where.phone = { contains: input.phone, mode: "insensitive" };
  }
  if (typeof input.is_email_verified === "boolean") {
    where.is_email_verified = input.is_email_verified;
  }
  if (input.registered_start_at || input.registered_end_at) {
    where.created_at = {};
    if (input.registered_start_at) {
      where.created_at.gte = input.registered_start_at;
    }
    if (input.registered_end_at) {
      where.created_at.lte = input.registered_end_at;
    }
  }

  // Sort
  let orderBy;
  if (input.sort_by) {
    const direction: Prisma.SortOrder =
      input.sort_order === "desc"
        ? Prisma.SortOrder.desc
        : Prisma.SortOrder.asc;
    if (
      ["email", "name", "phone", "created_at", "updated_at"].includes(
        input.sort_by,
      )
    ) {
      orderBy = { [input.sort_by]: direction };
    }
  }
  if (!orderBy) {
    orderBy = { created_at: Prisma.SortOrder.desc };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      orderBy: orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true, // only required summary info
      },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  const data = records.map((row) => ({
    id: row.id,
    name: row.name,
  }));

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data,
  };
}
