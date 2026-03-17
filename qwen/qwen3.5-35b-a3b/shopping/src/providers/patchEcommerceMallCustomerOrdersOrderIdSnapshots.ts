import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSnapshot.ISummary> {
  // Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Build where filter for snapshots
  const whereInput = {
    ecommerce_mall_order_id: props.orderId,
    ...(props.body.filter?.status !== undefined && {
      status: props.body.filter.status,
    }),
  } satisfies Prisma.ecommerce_mall_order_snapshotsWhereInput;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build orderBy based on sort parameter
  const orderByInput: Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { total_amount: "asc" }
      : { created_at: "desc" };
  // Query snapshots
  const data = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSnapshotAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_order_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
