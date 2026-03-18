import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImage.IUpdate;
}): Promise<IShoppingMallProductSnapshotImage.ISummary> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Forbidden", 403);
  }
  const requestedImageIds = props.body.images.map((image) => image.id);
  if (new Set(requestedImageIds).size !== requestedImageIds.length) {
    throw new HttpException("Duplicate image references are not allowed", 400);
  }
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
      where: { shopping_mall_product_snapshot_id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_snapshot_id: true,
      },
    });
  if (existingImages.length !== requestedImageIds.length) {
    throw new HttpException("Snapshot image membership is invalid", 400);
  }
  const existingImageIds = new Set(existingImages.map((image) => image.id));
  for (const imageId of requestedImageIds) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException("Snapshot image membership is invalid", 400);
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    for (let index = 0; index < props.body.images.length; index += 1) {
      await prisma.shopping_mall_product_snapshot_images.update({
        where: { id: props.body.images[index].id },
        data: {
          display_order: index,
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findUniqueOrThrow(
      {
        where: { id: props.body.images[0].id },
        ...ShoppingMallProductSnapshotImageAtSummaryTransformer.select(),
      },
    );
  return await ShoppingMallProductSnapshotImageAtSummaryTransformer.transform(
    updated,
  );
}
