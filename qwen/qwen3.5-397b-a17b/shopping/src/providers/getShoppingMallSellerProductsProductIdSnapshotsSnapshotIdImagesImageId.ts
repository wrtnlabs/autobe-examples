import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotImageTransformer } from "../transformers/ShoppingMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotImage> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Snapshot does not belong to the specified product",
      404,
    );
  }
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
  const record =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          id: props.imageId,
          shopping_mall_product_snapshot_id: props.snapshotId,
        },
        ...ShoppingMallProductSnapshotImageTransformer.select(),
      },
    );
  return await ShoppingMallProductSnapshotImageTransformer.transform(record);
}
