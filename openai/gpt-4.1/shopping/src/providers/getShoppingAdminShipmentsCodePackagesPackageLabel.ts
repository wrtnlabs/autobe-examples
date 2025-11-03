import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminShipmentsCodePackagesPackageLabel(props: {
  admin: AdminPayload;
  code: string;
  packageLabel: string;
}): Promise<IShoppingShipmentPackage> {
  // Step 1: Find the shipment by code and ensure not soft-deleted
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code: props.code,
      deleted_at: null,
    },
    select: { id: true, deleted_at: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // Step 2: Find the package within this shipment by packageLabel
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: props.packageLabel,
      deleted_at: null,
    },
  });
  if (!pkg) {
    throw new HttpException("Shipment package not found", 404);
  }

  // Step 3: Map package entity to DTO, handle date conversions & null/undefined precisely
  return {
    id: pkg.id,
    shopping_shipment_id: pkg.shopping_shipment_id,
    sequence: pkg.sequence,
    package_label: pkg.package_label,
    tracking_number: pkg.tracking_number,
    package_weight_grams: pkg.package_weight_grams,
    length_cm: pkg.length_cm,
    width_cm: pkg.width_cm,
    height_cm: pkg.height_cm,
    status: pkg.status,
    delivered_at:
      pkg.delivered_at === null || pkg.delivered_at === undefined
        ? null
        : toISOStringSafe(pkg.delivered_at),
    lost_at:
      pkg.lost_at === null || pkg.lost_at === undefined
        ? null
        : toISOStringSafe(pkg.lost_at),
    damaged_at:
      pkg.damaged_at === null || pkg.damaged_at === undefined
        ? null
        : toISOStringSafe(pkg.damaged_at),
    created_at: toISOStringSafe(pkg.created_at),
    updated_at: toISOStringSafe(pkg.updated_at),
    deleted_at:
      pkg.deleted_at === null || pkg.deleted_at === undefined
        ? null
        : toISOStringSafe(pkg.deleted_at),
  };
}
