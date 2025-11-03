import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerShipmentsCodePackagesPackageLabel(props: {
  customer: CustomerPayload;
  code: string;
  packageLabel: string;
}): Promise<IShoppingShipmentPackage> {
  // Find the target shipment by code (must not be soft-deleted)
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: { code: props.code, deleted_at: null },
    select: { id: true, shopping_order_id: true },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  // Only allow if the shipment's order belongs to this customer and order isn't deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      id: shipment.shopping_order_id,
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order)
    throw new HttpException("You are not authorized for this shipment", 403);

  // Find the matching package by shipment id and package label (must not be soft-deleted)
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: props.packageLabel,
      deleted_at: null,
    },
  });
  if (!pkg) throw new HttpException("Package not found", 404);

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
    delivered_at: pkg.delivered_at ? toISOStringSafe(pkg.delivered_at) : null,
    lost_at: pkg.lost_at ? toISOStringSafe(pkg.lost_at) : null,
    damaged_at: pkg.damaged_at ? toISOStringSafe(pkg.damaged_at) : null,
    created_at: toISOStringSafe(pkg.created_at),
    updated_at: toISOStringSafe(pkg.updated_at),
    deleted_at: pkg.deleted_at ? toISOStringSafe(pkg.deleted_at) : null,
  };
}
