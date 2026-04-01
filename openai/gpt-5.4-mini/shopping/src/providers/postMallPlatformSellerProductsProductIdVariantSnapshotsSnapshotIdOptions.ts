import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductVariantSnapshotOptionTransformer } from "../transformers/MallPlatformProductVariantSnapshotOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductVariantSnapshotOption> {
  const option =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findFirstOrThrow(
      {
        where: {
          mall_platform_product_variant_snapshot_id: props.snapshotId,
        },
        ...MallPlatformProductVariantSnapshotOptionTransformer.select(),
      },
    );
  return await MallPlatformProductVariantSnapshotOptionTransformer.transform(
    option,
  );
}
