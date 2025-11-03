import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerShipmentsCodePackagesPackageLabelTrackingsTrackingSource(props: {
  customer: CustomerPayload;
  code: string;
  packageLabel: string;
  trackingSource: string;
}): Promise<IShoppingShipmentTracking> {
  // Find shipment by code
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code: props.code,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_order_id: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Find order to check ownership
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      id: shipment.shopping_order_id,
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException(
      "Unauthorized: Shipment does not belong to you",
      403,
    );
  }
  // Get package by packageLabel within shipment
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: props.packageLabel,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!pkg) {
    throw new HttpException("Package not found", 404);
  }
  // Find tracking record for package and trackingSource
  const tracking = await MyGlobal.prisma.shopping_shipment_trackings.findFirst({
    where: {
      shopping_shipment_package_id: pkg.id,
      tracking_source: props.trackingSource,
      deleted_at: null,
    },
  });
  if (!tracking) {
    throw new HttpException("Tracking information not found", 404);
  }
  // Map to IShoppingShipmentTracking structure
  return {
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
  };
}
