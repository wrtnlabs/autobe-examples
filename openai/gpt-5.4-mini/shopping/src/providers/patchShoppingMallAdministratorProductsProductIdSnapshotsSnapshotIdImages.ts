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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { ShoppingMallProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdSnapshotsSnapshotIdImages(props: {
  administrator: AdministratorPayload;
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
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (props.administrator.type !== "administrator")
    throw new HttpException("Forbidden", 403);
  if (props.body.images.length === 0)
    throw new HttpException("Empty images", 400);
  const uniqueIds = new Set<string>();
  for (const image of props.body.images) {
    if (uniqueIds.has(image.id))
      throw new HttpException("Duplicate snapshot image", 400);
    uniqueIds.add(image.id);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const currentImages =
      await prisma.shopping_mall_product_snapshot_images.findMany({
        where: {
          shopping_mall_product_snapshot_id: snapshot.id,
        },
        orderBy: {
          display_order: "asc",
        },
        select: {
          id: true,
          shopping_mall_product_snapshot_id: true,
          image_uri: true,
          display_order: true,
          created_at: true,
          productSnapshot:
            ShoppingMallProductSnapshotAtSummaryTransformer.select(),
        },
      });
    const currentById = new Map(
      currentImages.map((image) => [image.id, image]),
    );
    const orderedImages: typeof currentImages = [];
    for (const requested of props.body.images) {
      const existing = currentById.get(requested.id);
      if (existing === undefined)
        throw new HttpException("Invalid snapshot image", 400);
      if (existing.shopping_mall_product_snapshot_id !== snapshot.id)
        throw new HttpException("Invalid snapshot image", 400);
      orderedImages.push(existing);
    }
    for (let index = 0; index < orderedImages.length; index += 1) {
      const image = orderedImages[index];
      await prisma.shopping_mall_product_snapshot_images.update({
        where: { id: image.id },
        data: {
          display_order: index,
        },
      });
    }
    return prisma.shopping_mall_product_snapshot_images.findUniqueOrThrow({
      where: { id: orderedImages[0].id },
      select: {
        id: true,
        shopping_mall_product_snapshot_id: true,
        image_uri: true,
        display_order: true,
        created_at: true,
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
      },
    });
  });
  return await ShoppingMallProductSnapshotImageAtSummaryTransformer.transform(
    updated,
  );
}
