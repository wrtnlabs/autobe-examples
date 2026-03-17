import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotImageTransformer } from "../transformers/ShoppingMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotImage> {
  const image =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findUniqueOrThrow(
      {
        where: { id: props.imageId },
        ...ShoppingMallProductSnapshotImageTransformer.select(),
      },
    );
  if (image.snapshot.id !== props.snapshotId) {
    throw new HttpException(
      "Image does not belong to the specified snapshot",
      404,
    );
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      snapshots: {
        some: {
          id: props.snapshotId,
        },
      },
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException(
      "Snapshot does not belong to the specified product",
      404,
    );
  }
  return await ShoppingMallProductSnapshotImageTransformer.transform(image);
}
