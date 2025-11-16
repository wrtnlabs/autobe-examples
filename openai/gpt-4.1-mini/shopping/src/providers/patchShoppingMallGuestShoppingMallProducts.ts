import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchShoppingMallGuestShoppingMallProducts(props: {
  guest: GuestPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(props.body.searchProductCode && { code: props.body.searchProductCode }),
    ...(props.body.searchProductName && {
      name: { contains: props.body.searchProductName },
    }),
    ...(props.body.searchDescription && {
      description: { contains: props.body.searchDescription },
    }),
    ...(props.body.searchIsActive !== undefined && {
      is_active: props.body.searchIsActive,
    }),
    ...(props.body.searchSellerId && { seller_id: props.body.searchSellerId }),
  };

  const [products, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_products.count({ where }),
  ]);

  return {
    data: products.map((record) => ({
      id: record.id,
      code: record.code,
      name: record.name,
      is_active: record.is_active,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
