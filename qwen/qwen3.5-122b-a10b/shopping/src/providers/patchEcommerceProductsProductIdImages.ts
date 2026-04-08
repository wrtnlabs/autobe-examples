import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductImageAtSummaryTransformer } from "../transformers/EcommerceProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.IReorder;
}): Promise<IEcommerceProductImage.ISummary[]> {
  // Step 1: Validate product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: {
      id: true,
      seller_id: true,
      deleted_at: true,
      name: true,
      description: true,
      category_id: true,
      base_price: true,
    },
  });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Fetch all active images for this product
  const existingImages =
    await MyGlobal.prisma.ecommerce_product_images.findMany({
      where: {
        ecommerce_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true, display_order: true, image_url: true },
    });
  // Step 3: Validate request image IDs
  const requestIds = props.body.imageIds;
  const existingIds = new Set(existingImages.map((img) => img.id));
  // Check for duplicates in request
  const requestIdSet = new Set(requestIds);
  if (requestIdSet.size !== requestIds.length) {
    throw new HttpException("Duplicate image IDs in request", 400);
  }
  // Check count matches
  if (requestIds.length !== existingImages.length) {
    throw new HttpException(
      `Image count mismatch: expected ${existingImages.length}, got ${requestIds.length}`,
      400,
    );
  }
  // Check all IDs belong to this product
  for (const imageId of requestIds) {
    if (!existingIds.has(imageId)) {
      throw new HttpException(
        `Image ${imageId} does not belong to product ${props.productId}`,
        400,
      );
    }
  }
  // Step 4: Update display_order in transaction and create snapshot
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update each image's display_order based on array index
    for (let i = 0; i < requestIds.length; i++) {
      await tx.ecommerce_product_images.update({
        where: { id: requestIds[i] },
        data: { display_order: i, updated_at: new Date() },
      });
    }
    // Create product snapshot capturing product state
    const snapshotId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    await tx.ecommerce_product_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_product_id: props.productId,
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        base_price: product.base_price,
        created_at: new Date(),
      },
    });
  });
  // Step 5: Fetch and return updated images in new order
  const updatedImages = await MyGlobal.prisma.ecommerce_product_images.findMany(
    {
      where: { ecommerce_product_id: props.productId, deleted_at: null },
      orderBy: { display_order: "asc" },
      ...EcommerceProductImageAtSummaryTransformer.select(),
    },
  );
  return await ArrayUtil.asyncMap(
    updatedImages,
    EcommerceProductImageAtSummaryTransformer.transform,
  );
}
