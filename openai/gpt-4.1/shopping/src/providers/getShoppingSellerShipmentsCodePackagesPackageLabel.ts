import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerShipmentsCodePackagesPackageLabel(props: {
  seller: SellerPayload;
  code: string;
  packageLabel: string;
}): Promise<IShoppingShipmentPackage> {
  // 1. Find shipment by code
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code: props.code,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_seller_id: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // 2. Check seller owns this shipment
  if (shipment.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - not your shipment", 403);
  }

  // 3. Find shipment package by shipment id and label
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: props.packageLabel,
      deleted_at: null,
    },
  });
  if (!pkg) {
    throw new HttpException("Package not found", 404);
  }

  // 4. Map fields to IShoppingShipmentPackage
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
    delivered_at: pkg.delivered_at
      ? toISOStringSafe(pkg.delivered_at)
      : undefined,
    lost_at: pkg.lost_at ? toISOStringSafe(pkg.lost_at) : undefined,
    damaged_at: pkg.damaged_at ? toISOStringSafe(pkg.damaged_at) : undefined,
    created_at: toISOStringSafe(pkg.created_at),
    updated_at: toISOStringSafe(pkg.updated_at),
    deleted_at: pkg.deleted_at ? toISOStringSafe(pkg.deleted_at) : undefined,
  };
}
