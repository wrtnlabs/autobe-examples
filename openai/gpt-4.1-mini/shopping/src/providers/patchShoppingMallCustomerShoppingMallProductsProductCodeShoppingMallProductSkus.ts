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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallProductsProductCodeShoppingMallProductSkus(props: {
  customer: CustomerPayload;
  productCode: string;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Get product ID by productCode
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const whereCondition: Prisma.shopping_mall_product_skusWhereInput = {
    shopping_mall_product_id: product.id,
    ...(props.body.filters?.is_active !== undefined && {
      is_active: props.body.filters.is_active,
    }),
    ...(props.body.filters?.price_min !== undefined ||
    props.body.filters?.price_max !== undefined
      ? {
          price: {
            ...(props.body.filters?.price_min !== undefined
              ? { gte: props.body.filters.price_min }
              : {}),
            ...(props.body.filters?.price_max !== undefined
              ? { lte: props.body.filters.price_max }
              : {}),
          },
        }
      : {}),
    ...(props.body.search
      ? {
          sku_code: {
            contains: props.body.search,
            mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
          },
        }
      : {}),
  };

  const orderByCondition: Prisma.shopping_mall_product_skusOrderByWithRelationInput =
    props.body.sort_by && props.body.order
      ? {
          [props.body.sort_by]: props.body
            .order satisfies Prisma.SortOrder as Prisma.SortOrder,
        }
      : { created_at: "desc" satisfies Prisma.SortOrder as Prisma.SortOrder };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_product_skus.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((sku) => ({
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      inventory: sku.inventory satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      is_active: sku.is_active,
      created_at: toISOStringSafe(sku.created_at),
      updated_at: toISOStringSafe(sku.updated_at),
      deleted_at:
        sku.deleted_at !== null ? toISOStringSafe(sku.deleted_at) : null,
    })),
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
