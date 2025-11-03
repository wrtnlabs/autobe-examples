import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShipmentTrackings(props: {
  admin: AdminPayload;
  body: IShoppingMallShipmentTracking.IRequest;
}): Promise<IPageIShoppingMallShipmentTracking.ISummary> {
  const { body } = props;

  const pageNumber = body.page ?? 1;
  const limitNumber = body.limit ?? 20;
  const skip = (pageNumber - 1) * limitNumber;

  const allowedSortFields = [
    "id",
    "shipped_at",
    "delivered_at",
    "created_at",
    "updated_at",
  ];
  const sortBy =
    typeof body.sort_by === "string" && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const where: {
    deleted_at: null;
    shopping_mall_order_id?: string & tags.Format<"uuid">;
    tracking_number?: { contains: string };
    carrier_name?: { contains: string };
    shipping_status?: string;
    shipped_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    delivered_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = { deleted_at: null };

  if (body.order_id !== undefined && body.order_id !== null) {
    where.shopping_mall_order_id = body.order_id;
  }
  if (body.tracking_number !== undefined && body.tracking_number !== null) {
    where.tracking_number = { contains: body.tracking_number };
  }
  if (body.carrier_name !== undefined && body.carrier_name !== null) {
    where.carrier_name = { contains: body.carrier_name };
  }
  if (body.shipping_status !== undefined && body.shipping_status !== null) {
    where.shipping_status = body.shipping_status;
  }
  if (
    (body.shipped_from !== undefined && body.shipped_from !== null) ||
    (body.shipped_to !== undefined && body.shipped_to !== null)
  ) {
    where.shipped_at = {};
    if (body.shipped_from !== undefined && body.shipped_from !== null) {
      where.shipped_at.gte = body.shipped_from;
    }
    if (body.shipped_to !== undefined && body.shipped_to !== null) {
      where.shipped_at.lte = body.shipped_to;
    }
  }
  if (
    (body.delivered_from !== undefined && body.delivered_from !== null) ||
    (body.delivered_to !== undefined && body.delivered_to !== null)
  ) {
    where.delivered_at = {};
    if (body.delivered_from !== undefined && body.delivered_from !== null) {
      where.delivered_at.gte = body.delivered_from;
    }
    if (body.delivered_to !== undefined && body.delivered_to !== null) {
      where.delivered_at.lte = body.delivered_to;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_trackings.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNumber,
      select: {
        id: true,
        shopping_mall_order_id: true,
        tracking_number: true,
        carrier_name: true,
        shipping_status: true,
        shipped_at: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_shipment_trackings.count({ where }),
  ]);

  return {
    pagination: {
      current: pageNumber satisfies number as number,
      limit: limitNumber satisfies number as number,
      records: total,
      pages: Math.ceil(total / limitNumber),
    },
    data: results.map((row) => ({
      id: row.id,
      shopping_mall_order_id: row.shopping_mall_order_id,
      tracking_number: row.tracking_number,
      carrier_name: row.carrier_name,
      shipping_status: row.shipping_status,
      shipped_at: toISOStringSafe(row.shipped_at),
      delivered_at: row.delivered_at ? toISOStringSafe(row.delivered_at) : null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
