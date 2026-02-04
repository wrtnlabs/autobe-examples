import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallShipment> {
  // This endpoint returns aggregated dashboard counts, not individual shipment records.
  // The specification states: "Dashboard summary of shipment status counts for the authenticated seller."
  // We need to aggregate counts by status for shipments linked to this order.
  // Find all shipment items linked to the order
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
    },
    include: {
      shopping_mall_shipment_items: {
        select: {
          shopping_mall_shipment: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });
  // Count the shipments by status
  let pending = 0;
  let shipped = 0;
  let delivered = 0;
  let canceled = 0;
  for (const item of orderItems) {
    for (const shipmentItem of item.shopping_mall_shipment_items) {
      const status = shipmentItem.shopping_mall_shipment.status;
      if (status === "pending") pending++;
      else if (status === "shipped") shipped++;
      else if (status === "delivered") delivered++;
      else if (status === "canceled") canceled++;
    }
  }
  // Return aggregated dashboard data - per spec, only returns one record with counts
  return {
    data: [
      {
        pending,
        shipped,
        delivered,
        canceled,
      },
    ],
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
  };
}
