import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImageSnapshot";
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

export async function patchMallPlatformAdministratorProductsProductIdImageSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImageSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductImageSnapshot.ISummary> {
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true },
    });
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true, seller_account_id: true },
  });
  const page = props.body.page ?? 1;
  const requestedLimit = props.body.pageSize ?? props.body.limit ?? 100;
  const limit = requestedLimit > 100 ? 100 : requestedLimit;
  const skip = (page - 1) * limit;
  const orderBy =
    props.body.sort === "oldest"
      ? ({
          changed_at: "asc",
        } satisfies Prisma.mall_platform_product_image_snapshotsOrderByWithRelationInput)
      : ({
          changed_at: "desc",
        } satisfies Prisma.mall_platform_product_image_snapshotsOrderByWithRelationInput);
  const records =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.findMany({
      where: {
        mall_platform_product_id: props.productId,
      },
      skip,
      take: limit,
      orderBy,
      ...MallPlatformProductImageSnapshotTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.count({
      where: {
        mall_platform_product_id: props.productId,
      },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductImageSnapshotTransformer.transform,
    ),
  };
}
