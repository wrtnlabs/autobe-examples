import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminOrderItemsOrderItemIdRefund(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // Query order item with order (for customer) and shipment for delivered_at
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        status: true,
        order: {
          select: {
            customer_id: true,
          },
        },
        shipmentItem: {
          select: {
            shipment: {
              select: {
                delivered_at: true,
              },
            },
          },
        },
      },
    });
  // Validate order item status is DELIVERED
  if (orderItem.status !== "DELIVERED") {
    throw new HttpException(
      `Refund request only allowed for DELIVERED items. Current status: ${orderItem.status}`,
      400,
    );
  }
  // Get delivered_at from shipment
  const deliveredAt = orderItem.shipmentItem?.shipment?.delivered_at;
  if (!deliveredAt) {
    throw new HttpException("Order item has no delivery timestamp", 400);
  }
  // Validate within 7-day refund window
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const deadline = new Date(deliveredAt.getTime() + sevenDaysMs);
  if (now > deadline) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      400,
    );
  }
  // Check no existing refund request for this order item
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        order_item_id: props.orderItemId,
        deleted_at: null,
      },
    });
  if (existingRequest) {
    throw new HttpException(
      "A refund request already exists for this order item",
      409,
    );
  }
  // Create refund request
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: {
      id: v4(),
      reason: props.body.reason,
      status: "PENDING",
      delivered_at: deliveredAt,
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.orderItemId } },
      customer: { connect: { id: orderItem.order.customer_id } },
      respondedBySeller: undefined,
    },
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  return await ShoppingMallRefundRequestTransformer.transform(created);
}
