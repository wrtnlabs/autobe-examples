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
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_seller_id: true,
        shopping_category_id: true,
        name: true,
        description: true,
        base_price: true,
        deleted: true,
      },
    });
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted) {
    throw new HttpException("Product is deleted", 400);
  }
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
      },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  if (image.deleted_at !== null) {
    throw new HttpException("Image is already deleted", 400);
  }
  const snapshotId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_product_id: props.productId,
      shopping_mall_category_id: product.shopping_category_id,
      shopping_mall_seller_id: props.seller.id,
      name: product.name,
      description: product.description ?? "",
      base_price: product.base_price,
      snapshot_at: new Date(),
      created_at: new Date(),
    },
  });
  const activeImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  await MyGlobal.prisma.shopping_mall_product_snapshot_images.createMany({
    data: activeImages.map((img, index) => ({
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_snapshot_id: snapshotId,
      image_url: img.image_url,
      display_order: index,
      created_at: new Date(),
    })),
  });
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
