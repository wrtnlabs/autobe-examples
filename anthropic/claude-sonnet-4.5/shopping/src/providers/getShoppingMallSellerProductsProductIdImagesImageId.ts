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

export async function getShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const { seller, productId, imageId } = props;

  // Verify product exists and seller owns it
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only access images for your own products",
      403,
    );
  }

  // Fetch the specific product image
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: imageId,
      shopping_mall_product_id: productId,
    },
  });

  if (!image) {
    throw new HttpException("Product image not found", 404);
  }

  // Map database fields to API response
  return {
    id: image.id,
    shopping_mall_product_id: image.shopping_mall_product_id,
    shopping_mall_sku_id: image.shopping_mall_sku_id ?? undefined,
    image_url: image.image_url,
    display_order: image.display_order,
    is_primary: image.is_primary,
    alt_text: image.alt_text ?? undefined,
    created_at: toISOStringSafe(image.created_at),
  };
}
