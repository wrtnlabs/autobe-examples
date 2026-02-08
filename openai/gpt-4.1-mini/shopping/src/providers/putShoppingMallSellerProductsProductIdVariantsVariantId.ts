import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to the product", 400);
  }
  const updatedAt = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...props.body,
      updated_at: updatedAt,
    },
  });
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    price_override:
      updated.price_override === null ? undefined : updated.price_override,
    stock_quantity: updated.stock_quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
