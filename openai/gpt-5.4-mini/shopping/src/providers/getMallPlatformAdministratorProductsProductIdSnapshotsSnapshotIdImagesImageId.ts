import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductSnapshotImageTransformer } from "../transformers/MallPlatformProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductSnapshotImage> {
  const image =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          id: props.imageId,
          mall_platform_product_snapshot_id: props.snapshotId,
          productSnapshot: {
            id: props.snapshotId,
            mall_platform_product_id: props.productId,
          },
        },
        ...MallPlatformProductSnapshotImageTransformer.select(),
      },
    );
  return await MallPlatformProductSnapshotImageTransformer.transform(image);
}
