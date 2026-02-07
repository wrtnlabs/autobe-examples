import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShipmentsIdConfirmDelivery(props: {
  customer: CustomerPayload;
  id: string;
}): Promise<IShoppingMallShipment.ISummary> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      status: true,
      customer_confirmed_delivery: true,
      shipped_at: true,
      delivered_at: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Verify shipment is not already delivered
  if (shipment.status === "delivered") {
    throw new HttpException("Shipment is already delivered", 400);
  }
  // Determine new status based on current state
  const newStatus = shipment.status === "pending" ? "shipped" : shipment.status;
  const now = toISOStringSafe(new Date());
  // Update delivery confirmation
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.id },
    data: {
      customer_confirmed_delivery: true,
      delivered_at: now,
      status: newStatus,
    },
  });
  // Return empty ISummary object
  return {};
}
