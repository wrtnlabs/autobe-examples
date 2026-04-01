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

export async function getMallPlatformSellerProductsProductIdVariantSnapshotsSnapshotIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductVariantSnapshotOption> {
  const option =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          productVariantSnapshot: {
            id: props.snapshotId,
            productVariant: {
              product: {
                id: props.productId,
              },
            },
          },
        },
        ...MallPlatformProductVariantSnapshotOptionTransformer.select(),
      },
    );
  return await MallPlatformProductVariantSnapshotOptionTransformer.transform(
    option,
  );
}
