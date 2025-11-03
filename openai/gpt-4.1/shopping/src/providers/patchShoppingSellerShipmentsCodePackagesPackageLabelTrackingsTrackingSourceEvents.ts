import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTrackingEvent";
import { IPageIShoppingShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentTrackingEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerShipmentsCodePackagesPackageLabelTrackingsTrackingSourceEvents(props: {
  seller: SellerPayload;
  code: string;
  packageLabel: string;
  trackingSource: string;
  body: IShoppingShipmentTrackingEvent.IRequest;
}): Promise<IPageIShoppingShipmentTrackingEvent> {
  const { seller, code, packageLabel, trackingSource, body } = props;
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: { code, deleted_at: null, shopping_seller_id: seller.id },
    select: { id: true },
  });
  if (!shipment)
    throw new HttpException("Shipment not found or access denied", 404);

  const shipmentPackage =
    await MyGlobal.prisma.shopping_shipment_packages.findFirst({
      where: {
        shopping_shipment_id: shipment.id,
        package_label: packageLabel,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!shipmentPackage) throw new HttpException("Package not found", 404);

  const tracking = await MyGlobal.prisma.shopping_shipment_trackings.findFirst({
    where: {
      shopping_shipment_package_id: shipmentPackage.id,
      tracking_source: trackingSource,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!tracking) throw new HttpException("Tracking source not found", 404);

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const allowedSortFields = ["event_time", "event_code", "location"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "event_time";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  const where = {
    shopping_shipment_tracking_id: tracking.id,
    deleted_at: null,
    ...(body.event_code !== undefined && { event_code: body.event_code }),
    ...(body.location !== undefined && {
      location: { contains: body.location },
    }),
    ...(body.from_datetime !== undefined || body.to_datetime !== undefined
      ? {
          event_time: {
            ...(body.from_datetime !== undefined && {
              gte: body.from_datetime,
            }),
            ...(body.to_datetime !== undefined && { lte: body.to_datetime }),
          },
        }
      : {}),
    ...(body.search !== undefined && body.search.trim().length > 0
      ? {
          OR: [
            { event_code: { contains: body.search } },
            { location: { contains: body.search } },
            { raw_status: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Directly construct orderBy inline to avoid computed property issues
  let orderBy: Record<string, Prisma.SortOrder> = { event_time: "desc" };
  if (
    sortBy === "event_time" ||
    sortBy === "event_code" ||
    sortBy === "location"
  ) {
    orderBy = { [sortBy]: sortOrder as Prisma.SortOrder };
  }

  const [events, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_tracking_events.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_shipment_tracking_events.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: events.map((ev) => ({
      id: ev.id,
      shopping_shipment_tracking_id: ev.shopping_shipment_tracking_id,
      event_time: toISOStringSafe(ev.event_time),
      event_code: ev.event_code,
      location: ev.location ?? null,
      raw_status: ev.raw_status,
      external_ref: ev.external_ref ?? null,
      ingested_at: toISOStringSafe(ev.ingested_at),
      created_at: toISOStringSafe(ev.created_at),
      deleted_at: ev.deleted_at ? toISOStringSafe(ev.deleted_at) : undefined,
    })),
  };
}
