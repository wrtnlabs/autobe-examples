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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerShipmentTrackings(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentTracking.IRequest;
}): Promise<IPageIShoppingMallShipmentTracking.ISummary> {
  const { seller, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    shopping_mall_order_id?: string & tags.Format<"uuid">;
    tracking_number?: {
      contains: string;
    };
    carrier_name?: {
      contains: string;
    };
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

  const orderByField =
    body.sort_by === "shipped_at" || body.sort_by === "delivered_at"
      ? body.sort_by
      : "shipped_at";
  const orderByDirection = body.sort_order === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_trackings.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_shipment_trackings.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    tracking_number: item.tracking_number,
    carrier_name: item.carrier_name,
    shipping_status: item.shipping_status,
    shipped_at: toISOStringSafe(item.shipped_at),
    delivered_at: item.delivered_at ? toISOStringSafe(item.delivered_at) : null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
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
