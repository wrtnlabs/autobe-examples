import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentTracking";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminShipmentsCodePackagesPackageLabelTrackingsTrackingSource(props: {
  admin: AdminPayload;
  code: string;
  packageLabel: string;
  trackingSource: string;
}): Promise<IShoppingShipmentTracking> {
  const { code, packageLabel, trackingSource } = props;

  // 1. Find shipment by unique code
  const shipment = await MyGlobal.prisma.shopping_shipments.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // 2. Find package by label and shipment id
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: packageLabel,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!pkg) {
    throw new HttpException("Package not found", 404);
  }

  // 3. Find tracking by tracking_source and package id
  const tracking = await MyGlobal.prisma.shopping_shipment_trackings.findFirst({
    where: {
      shopping_shipment_package_id: pkg.id,
      tracking_source: trackingSource,
      deleted_at: null,
    },
  });
  if (!tracking) {
    throw new HttpException("Tracking not found", 404);
  }

  // 4. Construct IShoppingShipmentTracking
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
