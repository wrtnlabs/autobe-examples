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
import { ShoppingMallProductImageAtSummaryTransformer } from "../transformers/ShoppingMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdImagesReorder(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  productId: string;
  body: IShoppingMallProductImage.IReorder;
}): Promise<IShoppingMallProductImage.ISummary[]> {
  // Step 1: Verify product exists, is not deleted, and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      name: true,
      description: true,
      base_price: true,
      deleted_at: true,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify seller is active (not suspended/banned)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { id: true, suspended: true, banned: true },
  });
  if (seller === null || seller.suspended || seller.banned) {
    throw new HttpException("Account suspended or banned", 403);
  }
  // Step 3: Get all images for the product to validate request
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { id: true },
    });
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  // Validate all imageIds belong to this product
  for (const imageId of props.body.imageIds) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException("Invalid image ID", 400);
    }
  }
  // Step 4: Update display orders in transaction
  await MyGlobal.prisma.$transaction(
    props.body.imageIds.map((imageId, index) =>
      MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: imageId },
        data: {
          display_order: props.body.displayOrders[index],
        },
      }),
    ),
  );
  // Step 5: Get all images sorted by display_order for snapshot
  const allImages = await MyGlobal.prisma.shopping_mall_product_images.findMany(
    {
      where: { shopping_mall_product_id: props.productId },
      orderBy: { display_order: "asc" },
      select: { image_url: true, display_order: true },
    },
  );
  // Step 6: Create product snapshot with complete product state
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      images: JSON.stringify(allImages.map((img) => img.image_url)),
      created_at: new Date(),
    },
  });
  // Step 7: Fetch and return all images with updated order
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: { shopping_mall_product_id: props.productId },
    orderBy: { display_order: "asc" },
    ...ShoppingMallProductImageAtSummaryTransformer.select(),
  });
  return ArrayUtil.asyncMap(
    images,
    ShoppingMallProductImageAtSummaryTransformer.transform,
  );
}
