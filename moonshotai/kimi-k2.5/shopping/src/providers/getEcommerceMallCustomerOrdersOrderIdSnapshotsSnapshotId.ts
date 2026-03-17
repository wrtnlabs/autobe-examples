import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string;
  snapshotId: string;
}): Promise<IEcommerceMallOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        order_id: true,
        created_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_snapshotsFindUniqueOrThrowArgs);
  if (snapshot.order_id !== props.orderId) {
    throw new HttpException("Snapshot not found for this order", 404);
  }
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: snapshot.order_id },
    select: { customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: snapshot.id,
    orderId: snapshot.order_id,
    createdAt: snapshot.created_at.toISOString(),
    order: await EcommerceMallOrderAtSummaryTransformer.transform(
      snapshot.order,
    ),
  };
}
