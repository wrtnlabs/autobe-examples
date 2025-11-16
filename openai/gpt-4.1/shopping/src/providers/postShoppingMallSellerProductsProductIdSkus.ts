import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.ICreate;
}): Promise<IShoppingMallProductSku> {
  // Step 1: Parent product lookup and authorization
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  // Step 2: SKU code uniqueness
  const existingSku =
    await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });
  if (existingSku) {
    throw new HttpException("Duplicate sku_code for this product.", 409);
  }

  // Step 3: Business validations
  const allowedStatuses = [
    "draft",
    "active",
    "out_of_stock",
    "archived",
    "blocked",
    "pending_approval",
  ];
  if (typeof props.body.price !== "number" || props.body.price < 0) {
    throw new HttpException("Price must be a non-negative number.", 400);
  }
  if (typeof props.body.stock !== "number" || props.body.stock < 0) {
    throw new HttpException("Stock must be a non-negative integer.", 400);
  }
  if (!allowedStatuses.includes(props.body.status)) {
    throw new HttpException("Invalid SKU status.", 400);
  }

  // Step 4: SKU creation
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_skus.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      sku_code: props.body.sku_code,
      price: props.body.price,
      stock: props.body.stock,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Build minimal product summary for response
  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: {
      id: props.seller.id,
      business_name: (await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: props.seller.id },
        select: { business_name: true },
      }))!.business_name,
    },
    categories: [],
    created_at: toISOStringSafe(product.created_at),
  };

  return {
    id: created.id,
    product: productSummary,
    sku_code: created.sku_code,
    price: created.price,
    stock: created.stock,
    status: created.status,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at === null
        ? undefined
        : (toISOStringSafe(created.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
