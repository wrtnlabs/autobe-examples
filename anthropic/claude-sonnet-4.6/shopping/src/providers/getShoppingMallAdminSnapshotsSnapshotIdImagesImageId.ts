import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

export async function getShoppingMallAdminSnapshotsSnapshotIdImagesImageId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotImage> {
  // Verify the snapshot exists; throws 404 if not found
  await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
    select: { id: true },
  });
  // Retrieve the image scoped to the specific snapshot; throws 404 if not found
  const image =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          id: props.imageId,
          product_snapshot_id: props.snapshotId,
        },
        ...ShoppingMallProductSnapshotImageTransformer.select(),
      },
    );
  return await ShoppingMallProductSnapshotImageTransformer.transform(image);
}
