import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IImageCreate;
}): Promise<IShoppingMallProductImage> {
  const { seller, productId, body } = props;

  // STEP 1: Verify product exists and belongs to authenticated seller (MANDATORY AUTHORIZATION)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // STEP 2: MANDATORY authorization check - verify seller owns this product
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only upload images to your own products",
      403,
    );
  }

  // STEP 3: Count existing images and enforce 10 image limit
  const existingImageCount =
    await MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: productId,
      },
    });

  if (existingImageCount >= 10) {
    throw new HttpException(
      "Maximum image limit reached: Products can have up to 10 images",
      400,
    );
  }

  // STEP 4: Calculate display_order and is_primary
  const displayOrder = existingImageCount;
  const isPrimary = existingImageCount === 0;

  // STEP 5: Create new product image with generated ID and timestamp
  const now = toISOStringSafe(new Date());
  const imageId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: {
      id: imageId,
      shopping_mall_product_id: productId,
      shopping_mall_sku_id: undefined,
      image_url: body.image_url,
      display_order: displayOrder,
      is_primary: isPrimary,
      alt_text: undefined,
      created_at: now,
    },
  });

  // STEP 6: Return created image with proper type conversion
  return {
    id: imageId,
    shopping_mall_product_id: productId,
    shopping_mall_sku_id:
      created.shopping_mall_sku_id === null
        ? undefined
        : (created.shopping_mall_sku_id as string & tags.Format<"uuid">),
    image_url: created.image_url,
    display_order: created.display_order,
    is_primary: created.is_primary,
    alt_text: created.alt_text === null ? undefined : created.alt_text,
    created_at: now,
  };
}
