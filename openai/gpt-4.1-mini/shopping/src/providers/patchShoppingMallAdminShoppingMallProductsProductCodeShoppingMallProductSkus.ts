import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallProductsProductCodeShoppingMallProductSkus(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build filtering conditions
  const where = {
    product_code: props.productCode,
    deleted_at: null as null,
    ...(props.body.filters?.is_active !== undefined
      ? { is_active: props.body.filters.is_active }
      : {}),
    ...(props.body.filters?.price_min !== undefined ||
    props.body.filters?.price_max !== undefined
      ? {
          price: {
            ...(props.body.filters.price_min !== undefined
              ? { gte: props.body.filters.price_min }
              : {}),
            ...(props.body.filters.price_max !== undefined
              ? { lte: props.body.filters.price_max }
              : {}),
          },
        }
      : {}),
  };

  // Build sorting order
  const orderBy = (
    props.body.sort_by
      ? {
          [props.body.sort_by]: (props.body.order === "asc"
            ? "asc"
            : "desc") satisfies "asc" | "desc" as "asc" | "desc",
        }
      : { created_at: "desc" }
  ) satisfies Prisma.shopping_mall_product_skusOrderByWithRelationInput;

  // Fetch data and total count concurrently
  const [skus, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_skus.count({ where }),
  ]);

  // Convert to API response shape
  const data = skus.map((sku) => ({
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
    inventory: sku.inventory,
    is_active: sku.is_active,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at:
      sku.deleted_at !== null ? toISOStringSafe(sku.deleted_at) : null,
  }));

  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallProductSku.ISummary;
}
