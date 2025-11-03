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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerShipmentsCodePackagesPackageLabelTrackings(props: {
  seller: SellerPayload;
  code: string;
  packageLabel: string;
  body: IShoppingShipmentTracking.IRequest;
}): Promise<IPageIShoppingShipmentTracking> {
  const { seller, code, packageLabel, body } = props;

  // 1. Find shipment by code & seller (soft-delete aware)
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: {
      code,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!shipment)
    throw new HttpException("Shipment not found or access denied", 404);

  // 2. Find package by label & shipment (soft-delete aware)
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: packageLabel,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!pkg) throw new HttpException("Package not found", 404);

  // 3. Build filters for tracking instances
  const filter = {
    shopping_shipment_package_id: pkg.id,
    ...(body.tracking_source ? { tracking_source: body.tracking_source } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.event_start_at || body.event_end_at
      ? {
          last_update_at: {
            ...(body.event_start_at ? { gte: body.event_start_at } : {}),
            ...(body.event_end_at ? { lte: body.event_end_at } : {}),
          },
        }
      : {}),
    deleted_at: null,
  };

  // 4. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 5. Sorting
  const allowedSortFields = ["last_update_at", "status", "created_at"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "last_update_at";
  const order: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";

  // 6. Query for paging data
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_trackings.findMany({
      where: filter,
      orderBy: { [sort_by]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_shipment_trackings.count({ where: filter }),
  ]);

  // 7. Map to DTO
  const data: IShoppingShipmentTracking[] = rows.map((row) => ({
    id: row.id,
    shopping_shipment_package_id: row.shopping_shipment_package_id,
    tracking_source: row.tracking_source,
    external_tracking_id: row.external_tracking_id ?? undefined,
    status: row.status,
    status_detail: row.status_detail ?? undefined,
    last_update_at: toISOStringSafe(row.last_update_at),
    estimated_delivery_at: row.estimated_delivery_at
      ? toISOStringSafe(row.estimated_delivery_at)
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
