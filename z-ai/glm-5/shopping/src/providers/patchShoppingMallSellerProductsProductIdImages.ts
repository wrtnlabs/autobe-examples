import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.IOrder;
}): Promise<IShoppingMallProduct> {
  // Step 1: Verify product ownership and existence
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Filter out null entries from images array
  const imageIds = props.body.images.filter((id): id is string => id !== null);
  if (imageIds.length === 0) {
    throw new HttpException("At least one image ID must be provided", 400);
  }
  // Step 3: Get all existing images for this product
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  // Verify all image IDs in request exist and belong to this product
  for (const imageId of imageIds) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException(`Image not found in this product`, 400);
    }
  }
  // Step 4: Reorder images - assign new order values based on position in the input array
  // The first image in the array gets order=1, second gets order=2, etc.
  const orderUpdates: Array<{
    id: string;
    order: number;
  }> = imageIds.map((id, index) => ({
    id,
    order: index + 1,
  }));
  // Step 5: Update image orders in transaction
  await MyGlobal.prisma.$transaction(
    orderUpdates.map((update) =>
      MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: update.id },
        data: {
          order: update.order,
          updated_at: new Date(),
        },
      }),
    ),
  );
  // Step 6: Return updated product using transformer
  const updatedProduct =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updatedProduct);
}
