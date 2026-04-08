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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminOrdersOrderIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  // Verify order exists
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
  });
  // Build where clause with optional time range filters
  const where = {
    order_id: props.orderId,
    ...(props.body.createdAtFrom !== null && props.body.createdAtTo !== null
      ? {
          created_at: {
            gte: new Date(props.body.createdAtFrom),
            lte: new Date(props.body.createdAtTo),
          },
        }
      : props.body.createdAtFrom !== null
        ? { created_at: { gte: new Date(props.body.createdAtFrom) } }
        : props.body.createdAtTo !== null
          ? { created_at: { lte: new Date(props.body.createdAtTo) } }
          : {}),
  } satisfies Prisma.ecommerce_mall_order_snapshotsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_order_snapshots.count({
    where,
  });
  // Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
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
