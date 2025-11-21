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
  // Find the product and verify ownership and status
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
      status: { not: "archived" },
    },
  });

  if (!product) {
    throw new HttpException("Product not found or inaccessible", 404);
  }

  // Since ICreate is just a string, use body directly as image_url
  const image_url = props.body;

  // Use defaults for other fields
  const sort_order = 0;
  const is_primary = false;
  const alt_text = undefined;

  // If this is to be the primary image, clear any existing primary image
  if (is_primary) {
    await MyGlobal.prisma.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        is_primary: true,
      },
      data: {
        is_primary: false,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // Create the new image record
  const createdImage =
    await MyGlobal.prisma.shopping_mall_product_images.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        image_url,
        sort_order,
        is_primary,
        shopping_mall_product_id: props.productId,
        shopping_mall_product_variant_id: undefined,
        alt_text,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return with proper type-safe date conversion
  return {
    id: createdImage.id,
    image_url: createdImage.image_url,
    sort_order: createdImage.sort_order,
    is_primary: createdImage.is_primary,
    shopping_mall_product_id: createdImage.shopping_mall_product_id as
      | (string & tags.Format<"uuid">)
      | undefined,
    shopping_mall_product_variant_id:
      createdImage.shopping_mall_product_variant_id ?? undefined,
    alt_text: createdImage.alt_text ?? undefined,
    created_at: toISOStringSafe(createdImage.created_at),
    updated_at: toISOStringSafe(createdImage.updated_at),
  };
}
