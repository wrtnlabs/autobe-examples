import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerSnapshotAtSummaryTransformer } from "../transformers/EcommerceSellerSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerSnapshots(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
  body: IEcommerceSellerSnapshot.IRequest;
}): Promise<IPageIEcommerceSellerSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_seller_snapshotsWhereInput = {
    ecommerce_seller_id: props.seller.id,
    ...(props.body.fromDate || props.body.toDate
      ? {
          created_at: {
            ...(props.body.fromDate && {
              gte: props.body.fromDate,
            }),
            ...(props.body.toDate && {
              lte: props.body.toDate,
            }),
          },
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_seller_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceSellerSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_seller_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceSellerSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceSellerSnapshot.ISummary;
}
