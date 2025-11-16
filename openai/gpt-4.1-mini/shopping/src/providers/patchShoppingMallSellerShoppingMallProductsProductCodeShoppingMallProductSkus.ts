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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductSkus(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    product_id: product.id,
    deleted_at: null,
    ...(props.body.filters?.is_active !== undefined && {
      is_active: props.body.filters.is_active,
    }),
    ...(props.body.filters?.price_min !== undefined ||
    props.body.filters?.price_max !== undefined
      ? {
          price: {
            ...(props.body.filters.price_min !== undefined && {
              gte: props.body.filters.price_min,
            }),
            ...(props.body.filters.price_max !== undefined && {
              lte: props.body.filters.price_max,
            }),
          },
        }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { sku_code: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  // orderBy is correct as is, no type change needed
  const orderBy = props.body.sort_by
    ? { [props.body.sort_by]: props.body.order ?? ("asc" as "asc" | "desc") }
    : { created_at: "desc" as "asc" | "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_product_skus.count({ where }),
  ]);

  const items = data.map((sku) => ({
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

  const current = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    page as number,
  );
  const limitValidated = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >(limit as number);

  return {
    pagination: {
      current,
      limit: limitValidated,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items,
  };
}
