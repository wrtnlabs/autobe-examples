import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // Check product existence and seller ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to add images to this product.",
      403,
    );
  }
  // Always associate image with product, not SKU, for this endpoint
  // Only one of product_id or sku_id is allowed
  // Any client-supplied sku_id is ignored and forcibly set to null
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      shopping_mall_product_sku_id: null,
      cdn_uri: props.body.cdn_uri,
      alt_text: props.body.alt_text ?? null,
      position: props.body.position,
      label: props.body.label ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id ?? null,
    cdn_uri: created.cdn_uri,
    alt_text: created.alt_text ?? null,
    position: created.position,
    label: created.label ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
