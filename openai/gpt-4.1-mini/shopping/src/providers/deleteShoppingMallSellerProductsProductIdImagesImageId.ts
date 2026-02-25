import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify image existence and ownership
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  // Delete image
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // Fetch product details for snapshot
  const productForSnapshot =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        name: true,
        description: true,
        seller_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productImages: { select: { id: true } },
        productVariants: {
          select: { id: true, price_override: true, stock_quantity: true },
        },
      },
    });
  // Convert dates to ISO string
  const snapshotData = {
    ...productForSnapshot,
    created_at: toISOStringSafe(productForSnapshot.created_at),
    updated_at: toISOStringSafe(productForSnapshot.updated_at),
    deleted_at: productForSnapshot.deleted_at
      ? toISOStringSafe(productForSnapshot.deleted_at)
      : null,
  };
  // Create snapshot record
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      product: { connect: { id: props.productId } },
      snapshot_data: JSON.stringify(snapshotData),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
