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

export async function postShoppingMallMemberPostPurchaseRefundRequests(props: {
  member: MemberPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // Validate order item exists and belongs to the member
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        id: true,
        status: true,
        shopping_mall_order_id: true,
      },
    });
  // Validate order item belongs to authenticated member
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      member_id: true,
    },
  });
  if (order.member_id !== props.member.id) {
    throw new HttpException("Forbidden: Not the order owner", 403);
  }
  // Validate order item has 'delivered' status
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      `Refund request can only be created for delivered items. Current status: ${orderItem.status}`,
      400,
    );
  }
  // Check for existing refund request (unique constraint)
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        shopping_mall_order_item_id: props.body.order_item_id,
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "A refund request already exists for this order item",
      409,
    );
  }
  // Get shipment to verify delivery date for 7-day window validation
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      shopping_mall_order_id: orderItem.shopping_mall_order_id,
    },
    select: {
      delivered_at: true,
      shipped_at: true,
    },
  });
  // Calculate delivery date (delivered_at or auto-delivered after 14 days from shipped_at)
  const deliveryDate =
    shipment?.delivered_at ??
    (shipment?.shipped_at
      ? new Date(shipment.shipped_at.getTime() + 14 * 24 * 60 * 60 * 1000)
      : null);
  if (deliveryDate === null) {
    throw new HttpException(
      "Cannot determine delivery date for this order item",
      400,
    );
  }
  // Validate 7-day refund window
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const refundDeadline = new Date(deliveryDate.getTime() + sevenDaysMs);
  if (now > refundDeadline) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      400,
    );
  }
  // Create refund request using collector
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: await ShoppingMallRefundRequestCollector.collect({
      body: props.body,
      member: { id: props.member.id },
    }),
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  // Transform and return
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
