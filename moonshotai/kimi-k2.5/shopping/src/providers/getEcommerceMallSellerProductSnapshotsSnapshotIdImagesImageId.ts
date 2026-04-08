import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotImageTransformer } from "../transformers/EcommerceMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductSnapshotsSnapshotIdImagesImageId(props: {
  seller: SellerPayload;
  snapshotId: string;
  imageId: string;
}): Promise<IEcommerceMallProductSnapshotImage> {
  // Verify snapshot exists and seller owns the product
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        product: {
          is: {
            seller_id: props.seller.id,
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found or access denied", 403);
  }
  // Query the specific image
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          id: props.imageId,
          ecommerce_mall_product_snapshot_id: props.snapshotId,
        },
        ...EcommerceMallProductSnapshotImageTransformer.select(),
      },
    );
  return await EcommerceMallProductSnapshotImageTransformer.transform(image);
}
