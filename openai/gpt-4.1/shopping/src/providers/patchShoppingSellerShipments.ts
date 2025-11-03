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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingShipment.IRequest;
}): Promise<IPageIShoppingShipment.ISummary> {
  const { seller, body } = props;
  const page = body.page;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where = {
    deleted_at: null,
    shopping_seller_id: seller.id,
    ...(body.order_code && { order: { order_code: body.order_code } }),
    ...(body.status && { status: body.status }),
    ...(body.carrier_company && { carrier_company: body.carrier_company }),
    ...((body.scheduled_dispatch_at_from || body.scheduled_dispatch_at_to) && {
      scheduled_dispatch_at: {
        ...(body.scheduled_dispatch_at_from && {
          gte: body.scheduled_dispatch_at_from,
        }),
        ...(body.scheduled_dispatch_at_to && {
          lte: body.scheduled_dispatch_at_to,
        }),
      },
    }),
    ...((body.dispatched_at_from || body.dispatched_at_to) && {
      dispatched_at: {
        ...(body.dispatched_at_from && { gte: body.dispatched_at_from }),
        ...(body.dispatched_at_to && { lte: body.dispatched_at_to }),
      },
    }),
    ...((body.created_at_from || body.created_at_to) && {
      created_at: {
        ...(body.created_at_from && { gte: body.created_at_from }),
        ...(body.created_at_to && { lte: body.created_at_to }),
      },
    }),
  };

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort_field) {
    orderBy = { [body.sort_field]: body.sort_order ?? "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_shipments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_shipments.count({ where }),
  ]);

  const data = rows.map((s) => ({
    id: s.id,
    code: s.code,
    status: s.status,
    carrier_company: s.carrier_company,
    carrier_service_type: s.carrier_service_type ?? null,
    scheduled_dispatch_at: s.scheduled_dispatch_at
      ? toISOStringSafe(s.scheduled_dispatch_at)
      : null,
    dispatched_at: s.dispatched_at ? toISOStringSafe(s.dispatched_at) : null,
    delivered_at: s.delivered_at ? toISOStringSafe(s.delivered_at) : null,
    canceled_at: s.canceled_at ? toISOStringSafe(s.canceled_at) : null,
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
    shopping_order_id: s.shopping_order_id,
    shopping_seller_id: s.shopping_seller_id,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
