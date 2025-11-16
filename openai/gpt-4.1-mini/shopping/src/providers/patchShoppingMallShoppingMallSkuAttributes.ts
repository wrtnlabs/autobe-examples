import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import { IPageIShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuAttribute";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallSkuAttributes(props: {
  body: IShoppingMallSkuAttribute.IRequest;
}): Promise<IPageIShoppingMallSkuAttribute.ISummary> {
  const page =
    props.body.page && props.body.page > 0
      ? props.body.page
      : (1 satisfies number as number);
  const limit = (props.body.limit && props.body.limit > 0
    ? props.body.limit
    : 100) satisfies number as number;
  const skip = ((page - 1) * limit) satisfies number as number;

  const search = props.body.search?.trim() ?? undefined;

  const orderByField =
    props.body.orderBy && typeof props.body.orderBy === "string"
      ? props.body.orderBy
      : "code";
  const orderDirection = props.body.orderDirection === "desc" ? "desc" : "asc";

  // Build where clause with optional search filtering
  const where = search
    ? {
        OR: [
          {
            code: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_attributes.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
    }),
    MyGlobal.prisma.shopping_mall_sku_attributes.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: data.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
    })),
  };
}
