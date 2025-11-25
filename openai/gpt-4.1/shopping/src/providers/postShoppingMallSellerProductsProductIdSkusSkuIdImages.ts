import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdSkusSkuIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // Step 1: Validate SKU
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException(
      "SKU not found, not associated with product, or is deleted.",
      404,
    );
  }

  // Step 2: Validate Product under Seller's Ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Product is not found, not owned by seller, or is deleted.",
      403,
    );
  }

  // Step 3: Enforce position uniqueness for SKU images
  const conflict = await MyGlobal.prisma.shopping_mall_product_images.findFirst(
    {
      where: {
        shopping_mall_product_sku_id: props.skuId,
        position: props.body.position,
        deleted_at: null,
      },
    },
  );
  if (conflict) {
    throw new HttpException("Duplicate image position for this SKU.", 409);
  }

  // Step 4: Enforce SKU attachment only (never both product and SKU)
  if (
    (props.body.shopping_mall_product_id &&
      props.body.shopping_mall_product_id !== null) ||
    (props.body.shopping_mall_product_sku_id &&
      props.body.shopping_mall_product_sku_id !== props.skuId)
  ) {
    throw new HttpException(
      "Image must attach only to the precise SKU, not both product and SKU.",
      400,
    );
  }

  // Step 5: Create image record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: {
      id: v4(),
      shopping_mall_product_id: null,
      shopping_mall_product_sku_id: props.skuId,
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
    shopping_mall_product_id: undefined,
    shopping_mall_product_sku_id:
      created.shopping_mall_product_sku_id ?? undefined,
    cdn_uri: created.cdn_uri,
    alt_text: created.alt_text ?? undefined,
    position: created.position,
    label: created.label ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
