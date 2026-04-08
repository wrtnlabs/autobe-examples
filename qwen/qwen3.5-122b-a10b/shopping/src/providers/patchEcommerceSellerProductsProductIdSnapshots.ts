import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductSnapshot.IRequest;
}): Promise<IPageIEcommerceProductSnapshot.ISummary> {
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput = {
    ecommerce_product_id: props.productId,
    ...(props.body.from !== undefined && props.body.from !== null
      ? { created_at: { gte: props.body.from } }
      : {}),
    ...(props.body.to !== undefined && props.body.to !== null
      ? { created_at: { lte: props.body.to } }
      : {}),
  } satisfies Prisma.ecommerce_product_snapshotsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.ecommerce_product_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceProductSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_product_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceProductSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceProductSnapshot.ISummary;
}
