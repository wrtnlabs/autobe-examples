import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrdersOrderIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    order_id: props.orderId,
    ...(props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_order_snapshotsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
