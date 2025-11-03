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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminShipmentsCodePackagesPackageLabelTrackingsTrackingSourceEvents(props: {
  admin: AdminPayload;
  code: string;
  packageLabel: string;
  trackingSource: string;
  body: IShoppingShipmentTrackingEvent.IRequest;
}): Promise<IPageIShoppingShipmentTrackingEvent> {
  const { code, packageLabel, trackingSource, body } = props;

  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: { code, deleted_at: null },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  const shipmentPackage =
    await MyGlobal.prisma.shopping_shipment_packages.findFirst({
      where: {
        shopping_shipment_id: shipment.id,
        package_label: packageLabel,
        deleted_at: null,
      },
    });
  if (!shipmentPackage) throw new HttpException("Package not found", 404);

  const tracking = await MyGlobal.prisma.shopping_shipment_trackings.findFirst({
    where: {
      shopping_shipment_package_id: shipmentPackage.id,
      tracking_source: trackingSource,
      deleted_at: null,
    },
  });
  if (!tracking) throw new HttpException("Tracking instance not found", 404);

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const take = limit;

  const where: Record<string, any> = {
    shopping_shipment_tracking_id: tracking.id,
    deleted_at: null,
    ...(body.event_code !== undefined &&
      body.event_code !== null && { event_code: body.event_code }),
    ...(body.location !== undefined &&
      body.location !== null && { location: body.location }),
    ...(body.from_datetime !== undefined &&
      body.from_datetime !== null && {
        event_time: { gte: body.from_datetime },
      }),
    ...(body.to_datetime !== undefined &&
      body.to_datetime !== null && {
        event_time: {
          ...(body.from_datetime !== undefined &&
            body.from_datetime !== null && { gte: body.from_datetime }),
          lte: body.to_datetime,
        },
      }),
  };
  if (body.search) {
    where.OR = [
      { event_code: { contains: body.search } },
      { raw_status: { contains: body.search } },
      { location: { contains: body.search } },
    ];
  }

  const validSortFields = ["event_time", "event_code", "location"];
  const sortField =
    typeof body.sort_by === "string" && validSortFields.includes(body.sort_by)
      ? body.sort_by
      : "event_time";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_tracking_events.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take,
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
    data: rows.map((row) => ({
      id: row.id,
      shopping_shipment_tracking_id: row.shopping_shipment_tracking_id,
      event_time: toISOStringSafe(row.event_time),
      event_code: row.event_code,
      location: row.location ?? undefined,
      raw_status: row.raw_status,
      external_ref: row.external_ref ?? undefined,
      ingested_at: toISOStringSafe(row.ingested_at),
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
