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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerShipmentsCodePackagesPackageLabelTrackingsTrackingSourceEvents(props: {
  customer: CustomerPayload;
  code: string;
  packageLabel: string;
  trackingSource: string;
  body: IShoppingShipmentTrackingEvent.IRequest;
}): Promise<IPageIShoppingShipmentTrackingEvent> {
  const { customer, code, packageLabel, trackingSource, body } = props;

  // Find the shipment for this code
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code,
      deleted_at: null,
    },
    select: { id: true, shopping_order_id: true },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  // Authorization: ensure this shipment belongs to an order owned by the customer
  const orderRecord = await MyGlobal.prisma.shopping_orders.findUnique({
    where: {
      id: shipment.shopping_order_id,
      deleted_at: null,
    },
    select: { shopping_customer_id: true },
  });
  if (!orderRecord || orderRecord.shopping_customer_id !== customer.id) {
    throw new HttpException("Shipment not found", 404);
  }

  // Find the package (by label, belongs to shipment)
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: packageLabel,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!pkg) throw new HttpException("Package not found", 404);

  // Find tracking instance for package with given source
  const tracking = await MyGlobal.prisma.shopping_shipment_trackings.findFirst({
    where: {
      shopping_shipment_package_id: pkg.id,
      tracking_source: trackingSource,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!tracking) throw new HttpException("Tracking instance not found", 404);

  // Pagination variables
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Event filters
  const where: Record<string, unknown> = {
    shopping_shipment_tracking_id: tracking.id,
  };
  if (body.event_code !== undefined) {
    where.event_code = body.event_code;
  }
  if (body.location !== undefined) {
    where.location = body.location;
  }
  if (body.from_datetime !== undefined || body.to_datetime !== undefined) {
    const eventTime: Record<string, string> = {};
    if (body.from_datetime !== undefined) eventTime.gte = body.from_datetime;
    if (body.to_datetime !== undefined) eventTime.lte = body.to_datetime;
    where.event_time = eventTime;
  }
  if (body.search) {
    where.OR = [
      { event_code: { contains: body.search } },
      { raw_status: { contains: body.search } },
      { location: { contains: body.search } },
    ];
  }

  // Sorting
  const allowedSortFields = ["event_time", "event_code", "location"];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by as "event_time" | "event_code" | "location")
    : "event_time";
  const order = body.order === "asc" ? "asc" : "desc";

  // Query events & count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_tracking_events.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_shipment_tracking_events.count({ where }),
  ]);

  // Map to output DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_shipment_tracking_id: row.shopping_shipment_tracking_id,
    event_time: toISOStringSafe(row.event_time),
    event_code: row.event_code,
    location:
      row.location !== null && row.location !== undefined
        ? row.location
        : undefined,
    raw_status: row.raw_status,
    external_ref:
      row.external_ref !== null && row.external_ref !== undefined
        ? row.external_ref
        : undefined,
    ingested_at: toISOStringSafe(row.ingested_at),
    created_at: toISOStringSafe(row.created_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
