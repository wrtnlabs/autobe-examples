import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceMallAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  // Validate order exists first
  const orderExists = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!orderExists) {
    throw new HttpException("Order not found", 404);
  }
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      tracking_number: true,
      carrier_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((shipment) => ({
      id: shipment.id as string & tags.Format<"uuid">,
      tracking_number: shipment.tracking_number,
      carrier_name: shipment.carrier_name,
      shipment_status: "UNKNOWN" as string,
      created_at: toISOStringSafe(shipment.created_at) as string &
        tags.Format<"date-time">,
      updated_at: shipment.updated_at
        ? (toISOStringSafe(shipment.updated_at) as string &
            tags.Format<"date-time">)
        : undefined,
      deleted_at: shipment.deleted_at
        ? (toISOStringSafe(shipment.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
      seller: {
        id: shipment.id as string & tags.Format<"uuid">,
        shop_name: "" as string,
        approval_status: "UNKNOWN" as string,
        is_suspended: false,
        created_at: toISOStringSafe(new Date()),
      },
    })),
  };
}
