import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestCollector } from "../collectors/ShoppingMallRefundRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberRefundRequests(props: {
  member: MemberPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        id: true,
        status: true,
        shopping_mall_order_id: true,
        shopping_mall_shipment_id: true,
      },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund requests can only be submitted for delivered order items",
      400,
    );
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      id: true,
      member_id: true,
      deleted_at: true,
    },
  });
  if (order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.member_id !== props.member.id) {
    throw new HttpException("This order item does not belong to you", 403);
  }
  let deliveredAt: (string & tags.Format<"date-time">) | null = null;
  if (orderItem.shopping_mall_shipment_id) {
    const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
      where: {
        id: orderItem.shopping_mall_shipment_id,
        deleted_at: null,
      },
      select: {
        id: true,
        delivered_at: true,
      },
    });
    deliveredAt = shipment?.delivered_at
      ? toISOStringSafe(shipment.delivered_at)
      : null;
  }
  if (!deliveredAt) {
    throw new HttpException(
      "Cannot determine delivery date for refund window validation",
      400,
    );
  }
  const now = new Date();
  const deliveredDate = new Date(deliveredAt);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const refundDeadline = new Date(deliveredDate.getTime() + sevenDaysMs);
  if (now > refundDeadline) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      400,
    );
  }
  const existingRefundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.body.order_item_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingRefundRequest) {
    throw new HttpException(
      "A refund request already exists for this order item",
      400,
    );
  }
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
      member: { id: props.member.id },
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
