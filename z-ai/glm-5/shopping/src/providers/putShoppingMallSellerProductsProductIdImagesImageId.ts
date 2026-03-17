import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // 1. Verify product ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify image exists and belongs to product
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  // 3. Check display_order uniqueness if being updated
  if (props.body.display_order !== undefined) {
    const existingImage =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          display_order: props.body.display_order,
          id: { not: props.imageId },
        },
      });
    if (existingImage !== null) {
      throw new HttpException("Display order already in use", 409);
    }
  }
  // 4. Update the image
  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.image_url !== undefined && {
        image_url: props.body.image_url,
      }),
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
    },
    ...ShoppingMallProductImageTransformer.select(),
  });
  // 5. Return transformed result
  return await ShoppingMallProductImageTransformer.transform(updated);
}
