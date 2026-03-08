import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IJsonObject } from "@ORGANIZATION/PROJECT-api/lib/structures/IJsonObject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  // Verify order item exists and belongs to the order
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_order_id: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify customer owns the order (data isolation)
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: props.orderId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (order === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    order_item_id: props.itemId,
    ...(props.body.snapshot_type && {
      snapshot_type: props.body.snapshot_type,
    }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  };
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform results
  const data = snapshots.map((snapshot) => {
    const result: IEcommerceMallOrderItemSnapshot.ISummary = {
      id: snapshot.id as string & tags.Format<"uuid">,
      order_item_id: snapshot.order_item_id as string & tags.Format<"uuid">,
      snapshot_type: snapshot.snapshot_type as
        | "purchase"
        | "status_change"
        | "cancellation"
        | "refund",
      created_at: snapshot.created_at.toISOString() as string &
        tags.Format<"date-time">,
      changed_by_id: snapshot.changed_by_id
        ? (snapshot.changed_by_id as string & tags.Format<"uuid">)
        : undefined,
      previous_values: snapshot.previous_values
        ? (JSON.parse(snapshot.previous_values) as IJsonObject)
        : undefined,
      current_values: JSON.parse(snapshot.current_values) as {
        [key: string]: IJsonObject;
      },
    };
    return result;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallOrderItemSnapshot.ISummary;
}
