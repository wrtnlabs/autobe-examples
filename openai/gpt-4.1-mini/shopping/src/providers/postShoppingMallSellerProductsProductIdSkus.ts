import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallSku.ICreate;
}): Promise<IShoppingMallSku> {
  const { seller, productId, body } = props;

  // Check product ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: { shopping_mall_seller_id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Forbidden: you do not own this product", 403);
  }

  // Validate price positive
  if (body.price <= 0) {
    throw new HttpException("Price must be positive", 400);
  }

  // Check sku_code uniqueness within the product
  const existingSku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      shopping_mall_product_id: productId,
      sku_code: body.sku_code,
      deleted_at: null,
    },
  });
  if (existingSku) {
    throw new HttpException("Duplicate sku_code within product", 400);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_skus.create({
    data: {
      id: id,
      shopping_mall_product_id: productId,
      sku_code: body.sku_code,
      price: body.price,
      weight: body.weight ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    price: created.price,
    weight: created.weight ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
