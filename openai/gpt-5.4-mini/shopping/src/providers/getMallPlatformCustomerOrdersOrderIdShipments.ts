import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShipmentAtSummaryTransformer } from "../transformers/MallPlatformShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShipment.ISummary> {
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const shipments = await MyGlobal.prisma.mall_platform_shipments.findMany({
    where: {
      mall_platform_order_id: props.orderId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
    ...MallPlatformShipmentAtSummaryTransformer.select(),
  });
  const shipment = shipments[0];
  if (shipment === undefined) throw new HttpException("Not Found", 404);
  return MallPlatformShipmentAtSummaryTransformer.transform(shipment);
}
