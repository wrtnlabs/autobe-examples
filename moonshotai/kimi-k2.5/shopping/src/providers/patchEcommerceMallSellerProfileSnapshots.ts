import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    seller_id: props.seller.id,
    ...(props.body.createdAfter !== null || props.body.createdBefore !== null
      ? {
          created_at: {
            ...(props.body.createdAfter !== null && {
              gte: new Date(props.body.createdAfter),
            }),
            ...(props.body.createdBefore !== null && {
              lte: new Date(props.body.createdBefore),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
