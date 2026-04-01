import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductSnapshotVariantTransformer } from "../transformers/MallPlatformProductSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerProductsProductIdSnapshotsSnapshotIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductSnapshotVariant> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Not Found", 404);
  }
  const record =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.findFirstOrThrow(
      {
        where: {
          id: props.variantId,
          mall_platform_product_snapshot_id: props.snapshotId,
          productSnapshot: {
            id: props.snapshotId,
            mall_platform_product_id: props.productId,
          },
        },
        ...MallPlatformProductSnapshotVariantTransformer.select(),
      },
    );
  return await MallPlatformProductSnapshotVariantTransformer.transform(record);
}
