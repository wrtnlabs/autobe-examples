import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";
import { IPageIShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOptionGroup";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallSkuOptionGroups(props: {
  customer: CustomerPayload;
  body: IShoppingMallSkuOptionGroup.IRequest;
}): Promise<IPageIShoppingMallSkuOptionGroup.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const search = props.body.search ?? null;
  const sortBy = props.body.sortBy ?? null;
  const sortOrder = props.body.sortOrder ?? null;

  // Build where condition for Prisma query
  const where = {
    AND: [
      search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
            ],
          }
        : {},
    ],
  };

  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_option_groups.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy
        ? { [sortBy]: sortOrder ?? "asc" }
        : { created_at: "desc" },
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sku_option_groups.count({ where }),
  ]);

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
  };
}
