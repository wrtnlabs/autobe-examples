import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductImageSnapshotTransformer } from "../transformers/MallPlatformProductImageSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorProductsProductIdImageSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductImageSnapshot> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: {
      id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const snapshots =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.findMany({
      where: {
        mall_platform_product_id: props.productId,
      },
      orderBy: {
        created_at: "asc",
      },
      ...MallPlatformProductImageSnapshotTransformer.select(),
    });
  return snapshots.length > 0
    ? await MallPlatformProductImageSnapshotTransformer.transform(snapshots[0])
    : await MyGlobal.prisma.mall_platform_product_image_snapshots
        .findUniqueOrThrow({
          where: {
            id: props.productId,
          },
          ...MallPlatformProductImageSnapshotTransformer.select(),
        })
        .then(MallPlatformProductImageSnapshotTransformer.transform);
}
