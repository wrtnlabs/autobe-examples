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

export async function patchShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IRequest;
}): Promise<IPageIShoppingMallProductSku.ISummary> {
  // Step 1: Find product, check ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Step 2: Prepare filters
  const where = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.sku_code
      ? {
          sku_code: {
            contains: props.body.sku_code,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(props.body.min_price !== undefined
      ? { price: { gte: props.body.min_price } }
      : {}),
    ...(props.body.max_price !== undefined
      ? {
          price: {
            ...(props.body.min_price !== undefined
              ? { gte: props.body.min_price }
              : {}),
            lte: props.body.max_price,
          },
        }
      : {}),
    ...(props.body.min_stock !== undefined
      ? { stock: { gte: props.body.min_stock } }
      : {}),
    ...(props.body.max_stock !== undefined
      ? {
          stock: {
            ...(props.body.min_stock !== undefined
              ? { gte: props.body.min_stock }
              : {}),
            lte: props.body.max_stock,
          },
        }
      : {}),
  };

  // Step 3: Pagination and sorting
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderBy = props.body.sort_by
    ? {
        [props.body.sort_by]:
          props.body.order === "asc"
            ? Prisma.SortOrder.asc
            : Prisma.SortOrder.desc,
      }
    : { created_at: Prisma.SortOrder.desc };

  // Step 4: Total & data queries
  const [total, skus] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_skus.count({ where }),
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
  ]);

  // Step 5: Format result
  const result = {
    pagination: {
      current: page satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: skus.map((sku) => ({
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: "", // SKU attributes/variants not present in loaded schema
      in_stock: sku.stock > 0 && sku.status === "active",
    })),
  };
  return result;
}
