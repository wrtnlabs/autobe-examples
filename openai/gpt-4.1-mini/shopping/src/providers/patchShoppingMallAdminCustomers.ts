import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const {
    page: reqPage,
    limit: reqLimit,
    search,
    // Removed status as it is not in Prisma schema
    sort_by,
    order,
  } = props.body;

  const page = reqPage >= 1 ? reqPage : 1;
  const limit = reqLimit > 0 && reqLimit <= 100 ? reqLimit : 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(search
      ? {
          OR: [
            {
              name: { contains: search, mode: "insensitive" as "insensitive" },
            },
            {
              email: { contains: search, mode: "insensitive" as "insensitive" },
            },
          ],
        }
      : {}),
    // Removed status filter because field does not exist in Prisma schema
  } satisfies Prisma.shopping_mall_customersWhereInput;

  const orderBy =
    sort_by && order && (order === "asc" || order === "desc")
      ? { [sort_by]: order as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };

  const [customers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  return {
    data: customers.map((customer) => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      status: "active", // default value for missing Prisma field
      created_at: toISOStringSafe(customer.created_at),
      updated_at: customer.updated_at
        ? toISOStringSafe(customer.updated_at)
        : undefined,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
