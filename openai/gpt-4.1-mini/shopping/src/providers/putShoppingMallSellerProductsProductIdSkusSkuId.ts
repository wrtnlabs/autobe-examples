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

export async function putShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallSku.IUpdate;
}): Promise<IShoppingMallSku> {
  const { seller, productId, skuId, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Unauthorized: You do not own this product", 403);
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: skuId },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  if (sku.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "SKU does not belong to the specified product",
      400,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_skus.update({
    where: { id: skuId },
    data: {
      sku_code: body.sku_code,
      price: body.price,
      weight: body.weight ?? undefined,
      status: body.status,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    price: updated.price,
    weight: updated.weight ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
