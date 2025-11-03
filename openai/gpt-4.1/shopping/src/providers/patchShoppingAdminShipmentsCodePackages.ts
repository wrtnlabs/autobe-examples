import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";
import { IPageIShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipmentPackage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminShipmentsCodePackages(props: {
  admin: AdminPayload;
  code: string;
  body: IShoppingShipmentPackage.IRequest;
}): Promise<IPageIShoppingShipmentPackage.ISummary> {
  // 1. Lookup shipment by code
  const shipment = await MyGlobal.prisma.shopping_shipments.findFirst({
    where: { code: props.code, deleted_at: null },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  // 2. Build filters
  const filter = {
    shopping_shipment_id: shipment.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.tracking_number !== undefined &&
      props.body.tracking_number !== "" && {
        tracking_number: { contains: props.body.tracking_number },
      }),
    ...(props.body.package_label !== undefined &&
      props.body.package_label !== "" && {
        package_label: { contains: props.body.package_label },
      }),
    ...(props.body.sequence !== undefined && { sequence: props.body.sequence }),
    ...(props.body.delivered_at_from !== undefined ||
    props.body.delivered_at_to !== undefined
      ? {
          delivered_at: {
            ...(props.body.delivered_at_from !== undefined && {
              gte: props.body.delivered_at_from,
            }),
            ...(props.body.delivered_at_to !== undefined && {
              lte: props.body.delivered_at_to,
            }),
          },
        }
      : {}),
  };

  // 3. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Sorting
  let sortField: "sequence" | "delivered_at" | "status" = "sequence";
  if (
    props.body.sort_by === "sequence" ||
    props.body.sort_by === "delivered_at" ||
    props.body.sort_by === "status"
  ) {
    sortField = props.body.sort_by;
  }
  const sortOrder: "asc" | "desc" =
    props.body.sort_order === "desc" ? "desc" : "asc";

  // 5. Parallel query and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipment_packages.findMany({
      where: filter,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_shipment_packages.count({ where: filter }),
  ]);

  // 6. Map results to ISummary
  const data = rows.map((pkg) => ({
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
  }));

  // 7. Return page result
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
