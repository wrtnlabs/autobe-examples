import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
  // 1. Authorization - verify seller owns the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Image validation - verify image belongs to this product
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, shopping_mall_product_id: true, order: true },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  // 3. Handle order conflicts - shift other images if needed
  if (image.order !== props.body.order) {
    const existingWithOrder =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          order: props.body.order,
          id: { not: props.imageId },
        },
      });
    if (existingWithOrder) {
      // Shift all images with order >= new order to make room
      const imagesToShift =
        await MyGlobal.prisma.shopping_mall_product_images.findMany({
          where: {
            shopping_mall_product_id: props.productId,
            order: { gte: props.body.order },
            id: { not: props.imageId },
          },
          orderBy: { order: "desc" },
        });
      for (const img of imagesToShift) {
        await MyGlobal.prisma.shopping_mall_product_images.update({
          where: { id: img.id },
          data: { order: img.order + 1, updated_at: new Date() },
        });
      }
    }
    // Update the target image's order
    await MyGlobal.prisma.shopping_mall_product_images.update({
      where: { id: props.imageId },
      data: { order: props.body.order, updated_at: new Date() },
    });
  }
  // 4. Create product snapshot (per snapshot principle)
  const now = new Date();
  const snapshot = await MyGlobal.prisma.shopping_mall_product_snapshots.create(
    {
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        shopping_mall_seller_id: product.seller_id,
        shopping_mall_category_id: product.category_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        created_at: now,
      },
    },
  );
  // Create snapshot images for all product images
  const allImages = await MyGlobal.prisma.shopping_mall_product_images.findMany(
    {
      where: { shopping_mall_product_id: props.productId },
      select: { id: true },
    },
  );
  for (const img of allImages) {
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.create({
      data: {
        id: v4(),
        shopping_mall_product_snapshot_id: snapshot.id,
        shopping_mall_product_image_id: img.id,
        created_at: now,
      },
    });
  }
  // Create variant snapshots
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      select: { id: true, sku_code: true, price: true },
    });
  for (const variant of variants) {
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_product_snapshot_id: snapshot.id,
        shopping_mall_product_variant_id: variant.id,
        sku_code: variant.sku_code,
        price_override: variant.price,
        created_at: now,
      },
    });
  }
  // 5. Return updated image using transformer
  const updatedImage =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(updatedImage);
}
