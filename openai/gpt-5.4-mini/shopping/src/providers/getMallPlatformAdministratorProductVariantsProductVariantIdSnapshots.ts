import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductVariantSnapshotTransformer } from "../transformers/MallPlatformProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorProductVariantsProductVariantIdSnapshots(props: {
  administrator: AdministratorPayload;
  productVariantId: string & tags.Format<"uuid">;
}): Promise<IPageIMallPlatformProductVariantSnapshot.ISummary> {
  const productVariant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: {
        id: props.productVariantId,
      },
      select: {
        id: true,
      },
    });
  const snapshots =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findMany({
      where: {
        mall_platform_product_variant_id: productVariant.id,
      },
      orderBy: {
        created_at: "desc",
      },
      ...MallPlatformProductVariantSnapshotTransformer.select(),
    });
  return {
    pagination: {
      current: 1,
      limit: snapshots.length,
      records: snapshots.length,
      pages: snapshots.length === 0 ? 0 : 1,
    },
    data: await ArrayUtil.asyncMap(
      snapshots,
      MallPlatformProductVariantSnapshotTransformer.transform,
    ),
  };
}
