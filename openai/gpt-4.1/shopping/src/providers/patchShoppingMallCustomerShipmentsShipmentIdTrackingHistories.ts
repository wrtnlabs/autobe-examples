import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import { IPageIShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTrackingHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShipmentsShipmentIdTrackingHistories(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.IRequest;
}): Promise<IPageIShoppingMallShipmentTrackingHistory> {
  // 1. Validate shipment existence and ownership
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { order_id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // Ownership: order_id must exist and belong to props.customer.id
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: shipment.order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (order === null || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const {
    status,
    event_code,
    search,
    from_event_time,
    to_event_time,
    page,
    limit,
  } = props.body;
  // 2. Build filter
  const where: Record<string, unknown> = {
    shipment_id: props.shipmentId,
    ...(status && { status }),
    ...(event_code && { event_code }),
    ...(search && {
      OR: [
        { tracking_message: { contains: search } },
        { location: { contains: search } },
        { event_code: { contains: search } },
      ],
    }),
    ...(from_event_time || to_event_time
      ? {
          event_time: Object.assign(
            {},
            from_event_time && { gte: from_event_time },
            to_event_time && { lte: to_event_time },
          ),
        }
      : {}),
  };
  const skip = (page - 1) * limit;
  // 3. Query count and records
  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_tracking_histories.count({ where }),
    MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findMany({
      where,
      skip,
      take: limit,
      orderBy: { event_time: "asc" },
    }),
  ]);
  // 4. Map records
  const data = records.map((r) => ({
    id: r.id,
    shipment_id: r.shipment_id,
    event_time: toISOStringSafe(r.event_time),
    location:
      typeof r.location === "undefined"
        ? undefined
        : r.location === null
          ? null
          : r.location,
    latitude:
      typeof r.latitude === "undefined"
        ? undefined
        : r.latitude === null
          ? null
          : r.latitude,
    longitude:
      typeof r.longitude === "undefined"
        ? undefined
        : r.longitude === null
          ? null
          : r.longitude,
    event_code:
      typeof r.event_code === "undefined"
        ? undefined
        : r.event_code === null
          ? null
          : r.event_code,
    status: r.status,
    tracking_message: r.tracking_message,
    created_at: toISOStringSafe(r.created_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
