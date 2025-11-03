import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";
import { IPageIShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentTracking";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerShipmentsCodePackagesPackageLabelTrackings(props: {
  customer: CustomerPayload;
  code: string;
  packageLabel: string;
  body: IShoppingShipmentTracking.IRequest;
}): Promise<IPageIShoppingShipmentTracking> {
  // 1. Lookup the shipment by code
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: { code: props.code, deleted_at: null },
    select: { id: true, shopping_order_id: true },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  // 2. Lookup the order for this shipment (only for customer access control)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { id: shipment.shopping_order_id, deleted_at: null },
    select: { shopping_customer_id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (order.shopping_customer_id !== props.customer.id)
    throw new HttpException("Forbidden", 403);

  // 3. Lookup the shipment package by label and shipment
  const shipmentPackage =
    await MyGlobal.prisma.shopping_shipment_packages.findFirst({
      where: {
        package_label: props.packageLabel,
        shopping_shipment_id: shipment.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!shipmentPackage) throw new HttpException("Package not found", 404);

  // 4. Build Prisma where clause for trackings
  const where = {
    shopping_shipment_package_id: shipmentPackage.id,
    ...(props.body.tracking_source !== undefined && {
      tracking_source: props.body.tracking_source,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.event_start_at !== undefined &&
      props.body.event_start_at !== null && {
        last_update_at: { gte: props.body.event_start_at },
      }),
    ...(props.body.event_end_at !== undefined &&
      props.body.event_end_at !== null && {
        last_update_at: { lte: props.body.event_end_at },
      }),
  };

  // 5. Sort & pagination
  const sortBy =
    props.body.sort_by &&
    ["event_time", "status", "created_at", "last_update_at"].includes(
      props.body.sort_by,
    )
      ? props.body.sort_by
      : "last_update_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 20);
  const skip = (page - 1) * limit;

  // 6. Query total & page data concurrently
  const [total, trackings] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_trackings.count({ where }),
    MyGlobal.prisma.shopping_shipment_trackings.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  // 7. Map DB entities to DTO, handling all date/nullable fields
  const data = trackings.map((tracking) => ({
    id: tracking.id,
    shopping_shipment_package_id: tracking.shopping_shipment_package_id,
    tracking_source: tracking.tracking_source,
    external_tracking_id: tracking.external_tracking_id ?? undefined,
    status: tracking.status,
    status_detail: tracking.status_detail ?? undefined,
    last_update_at: toISOStringSafe(tracking.last_update_at),
    estimated_delivery_at: tracking.estimated_delivery_at
      ? toISOStringSafe(tracking.estimated_delivery_at)
      : undefined,
    created_at: toISOStringSafe(tracking.created_at),
    updated_at: toISOStringSafe(tracking.updated_at),
    deleted_at: tracking.deleted_at
      ? toISOStringSafe(tracking.deleted_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
