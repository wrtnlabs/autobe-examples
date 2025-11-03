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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminShipmentsCodePackagesPackageLabelTrackings(props: {
  admin: AdminPayload;
  code: string;
  packageLabel: string;
  body: IShoppingShipmentTracking.IRequest;
}): Promise<IPageIShoppingShipmentTracking> {
  const { code, packageLabel, body } = props;

  // 1. Validate shipment exists
  const shipment = await MyGlobal.prisma.shopping_shipments.findUnique({
    where: { code },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  // 2. Validate package exists under shipment
  const pkg = await MyGlobal.prisma.shopping_shipment_packages.findFirst({
    where: {
      shopping_shipment_id: shipment.id,
      package_label: packageLabel,
    },
  });
  if (!pkg) throw new HttpException("Package not found for this shipment", 404);

  // 3. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Where filters
  const filter: Record<string, any> = { shopping_shipment_package_id: pkg.id };
  if (body.tracking_source !== undefined)
    filter.tracking_source = body.tracking_source;
  if (body.status !== undefined) filter.status = body.status;
  if (body.event_start_at !== undefined || body.event_end_at !== undefined) {
    filter.last_update_at = {};
    if (body.event_start_at !== undefined && body.event_start_at !== null)
      filter.last_update_at.gte = body.event_start_at;
    if (body.event_end_at !== undefined && body.event_end_at !== null)
      filter.last_update_at.lte = body.event_end_at;
    if (Object.keys(filter.last_update_at).length === 0)
      delete filter.last_update_at;
  }

  // 5. Sorting
  let orderBy: Record<string, "asc" | "desc"> = { last_update_at: "desc" };
  if (body.sort_by) {
    orderBy = { [body.sort_by]: body.sort_order ?? "desc" };
  }

  // 6. Query paginated results
  const [data, records] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_trackings.findMany({
      where: filter,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_shipment_trackings.count({ where: filter }),
  ]);

  // 7. Map results to DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((row) => ({
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
    })),
  };
}
