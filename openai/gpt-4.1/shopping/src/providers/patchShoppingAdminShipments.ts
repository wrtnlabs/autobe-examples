import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipment";
import { IPageIShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingShipment.IRequest;
}): Promise<IPageIShoppingShipment.ISummary> {
  const {
    page,
    limit,
    order_code,
    seller_id,
    status,
    carrier_company,
    scheduled_dispatch_at_from,
    scheduled_dispatch_at_to,
    dispatched_at_from,
    dispatched_at_to,
    created_at_from,
    created_at_to,
    sort_field,
    sort_order,
  } = props.body;

  const take = limit ?? 20;
  const skip = (page - 1) * take;

  const where = {
    deleted_at: null,
    ...(order_code && { code: { contains: order_code } }),
    ...(seller_id && { shopping_seller_id: seller_id }),
    ...(status && { status }),
    ...(carrier_company && { carrier_company }),
    ...((scheduled_dispatch_at_from || scheduled_dispatch_at_to) && {
      scheduled_dispatch_at: {
        ...(scheduled_dispatch_at_from && { gte: scheduled_dispatch_at_from }),
        ...(scheduled_dispatch_at_to && { lte: scheduled_dispatch_at_to }),
      },
    }),
    ...((dispatched_at_from || dispatched_at_to) && {
      dispatched_at: {
        ...(dispatched_at_from && { gte: dispatched_at_from }),
        ...(dispatched_at_to && { lte: dispatched_at_to }),
      },
    }),
    ...((created_at_from || created_at_to) && {
      created_at: {
        ...(created_at_from && { gte: created_at_from }),
        ...(created_at_to && { lte: created_at_to }),
      },
    }),
  };

  const allowedSortFields = [
    "created_at",
    "updated_at",
    "scheduled_dispatch_at",
    "dispatched_at",
    "delivered_at",
  ];
  const orderByField = allowedSortFields.includes(sort_field ?? "")
    ? sort_field!
    : "created_at";
  const orderByDirection: "asc" | "desc" =
    sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipments.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_shipments.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    carrier_company: row.carrier_company,
    carrier_service_type: row.carrier_service_type ?? null,
    scheduled_dispatch_at: row.scheduled_dispatch_at
      ? toISOStringSafe(row.scheduled_dispatch_at)
      : null,
    dispatched_at: row.dispatched_at
      ? toISOStringSafe(row.dispatched_at)
      : null,
    delivered_at: row.delivered_at ? toISOStringSafe(row.delivered_at) : null,
    canceled_at: row.canceled_at ? toISOStringSafe(row.canceled_at) : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    shopping_order_id: row.shopping_order_id,
    shopping_seller_id: row.shopping_seller_id,
  }));

  const pages = Math.ceil(total / take);
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages,
    },
    data,
  };
}
