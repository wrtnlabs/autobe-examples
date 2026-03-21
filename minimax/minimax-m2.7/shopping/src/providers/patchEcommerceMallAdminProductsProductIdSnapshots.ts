import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: { ecommerce_mall_product_id: props.productId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: { ecommerce_mall_product_id: props.productId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallProductSnapshotAtSummaryTransformer.transform,
    ),
  };
}
