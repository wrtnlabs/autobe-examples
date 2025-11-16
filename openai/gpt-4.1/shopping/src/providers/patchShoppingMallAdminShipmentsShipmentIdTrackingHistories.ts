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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShipmentsShipmentIdTrackingHistories(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentTrackingHistory.IRequest;
}): Promise<IPageIShoppingMallShipmentTrackingHistory> {
  const {
    shipmentId,
    body: {
      status,
      event_code,
      search,
      from_event_time,
      to_event_time,
      page,
      limit,
    },
  } = props;

  const where = {
    shipment_id: shipmentId,
    ...(status ? { status } : {}),
    ...(event_code ? { event_code } : {}),
    ...(search
      ? {
          OR: [
            {
              tracking_message: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              location: search
                ? { contains: search, mode: Prisma.QueryMode.insensitive }
                : undefined,
            },
            {
              event_code: search
                ? { contains: search, mode: Prisma.QueryMode.insensitive }
                : undefined,
            },
          ],
        }
      : {}),
    ...(from_event_time || to_event_time
      ? {
          event_time: {
            ...(from_event_time ? { gte: from_event_time } : {}),
            ...(to_event_time ? { lte: to_event_time } : {}),
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;
  const take = limit;

  const [events, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_tracking_histories.findMany({
      where,
      skip,
      take,
      orderBy: { event_time: "asc" },
    }),
    MyGlobal.prisma.shopping_mall_shipment_tracking_histories.count({ where }),
  ]);

  const data = events.map((e) => ({
    id: e.id,
    shipment_id: e.shipment_id,
    event_time: toISOStringSafe(e.event_time),
    location:
      e.location === null || typeof e.location === "undefined"
        ? undefined
        : e.location,
    latitude:
      e.latitude === null || typeof e.latitude === "undefined"
        ? undefined
        : e.latitude,
    longitude:
      e.longitude === null || typeof e.longitude === "undefined"
        ? undefined
        : e.longitude,
    event_code:
      e.event_code === null || typeof e.event_code === "undefined"
        ? undefined
        : e.event_code,
    status: e.status,
    tracking_message: e.tracking_message,
    created_at: toISOStringSafe(e.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
