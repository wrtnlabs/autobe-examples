import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductSnapshotAtSummaryTransformer } from "../transformers/MallPlatformProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductSnapshot.ISummary> {
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
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const search =
    props.body.search === undefined ? undefined : props.body.search.trim();
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_product_id: props.productId,
    ...(search === undefined || search.length === 0
      ? {}
      : {
          OR: [
            { snapshot_kind: { contains: search } },
            { product_name: { contains: search } },
            { product_description: { contains: search } },
            { category_name: { contains: search } },
          ],
        }),
  } satisfies Prisma.mall_platform_product_snapshotsWhereInput;
  const data = await MyGlobal.prisma.mall_platform_product_snapshots.findMany({
    where,
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    ...MallPlatformProductSnapshotAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.mall_platform_product_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MallPlatformProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
