import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotImageTransformer } from "../transformers/EcommerceMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductSnapshotsSnapshotIdImagesImageId(props: {
  admin: AdminPayload;
  snapshotId: string;
  imageId: string;
}): Promise<IEcommerceMallProductSnapshotImage> {
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
