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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerShipmentsShipmentIdTrackingHistories(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.IRequest;
}): Promise<IPageIShoppingMallShipmentTrackingHistory> {
  // 1. Authorization: seller must be creator or assignee
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { created_by_seller_id: true },
  });
  if (!shipment || shipment.created_by_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have access to this shipment or it does not exist.",
      403,
    );
  }
  // 2. Dynamic filters
  const {
    status,
    event_code,
    search,
    from_event_time,
    to_event_time,
    page,
    limit,
  } = props.body;

  const filters: Record<string, any> = { shipment_id: props.shipmentId };
  if (status) filters.status = status;
  if (event_code) filters.event_code = event_code;
  if (from_event_time || to_event_time) {
    filters.event_time = {};
    if (from_event_time) filters.event_time.gte = from_event_time;
    if (to_event_time) filters.event_time.lte = to_event_time;
  }
  // 3. Text search
  let orSearch: any[] | undefined;
  if (search) {
    orSearch = [
      { tracking_message: { contains: search } },
      { location: { contains: search } },
      { event_code: { contains: search } },
    ];
  }
  // 4. Pagination
  const skip = (page - 1) * limit;
  const take = limit;
  const where = orSearch ? { ...filters, OR: orSearch } : filters;

  // Query + count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findMany({
      where,
      skip,
      take,
      orderBy: [{ event_time: "asc" }, { created_at: "asc" }],
    }),
    MyGlobal.prisma.shopping_mall_shipment_tracking_histories.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((event) => ({
      id: event.id,
      shipment_id: event.shipment_id,
      event_time: toISOStringSafe(event.event_time),
      location: event.location === null ? null : event.location,
      latitude: event.latitude === null ? null : event.latitude,
      longitude: event.longitude === null ? null : event.longitude,
      event_code: event.event_code === null ? null : event.event_code,
      status: event.status,
      tracking_message: event.tracking_message,
      created_at: toISOStringSafe(event.created_at),
    })),
  };
}
