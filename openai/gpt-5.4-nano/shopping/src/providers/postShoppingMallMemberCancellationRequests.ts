import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCancellationRequests(props: {
  member: MemberPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const { member, body } = props;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: body.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        line_item_status: true,
        deleted_at: true,
        shopping_mall_shipment_id: true,
      },
    });
    const shoppingOrder = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_order_id },
      select: { shopping_customer_id: true },
    });
    if (shoppingOrder.shopping_customer_id !== member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (orderItem.deleted_at !== null) {
      throw new HttpException("Order item is deleted", 400);
    }
    if (orderItem.shopping_mall_shipment_id !== null) {
      throw new HttpException(
        "Cannot request cancellation after shipment",
        400,
      );
    }
    const status = orderItem.line_item_status;
    const ineligible = new Set([
      "delivered",
      "shipped",
      "cancelled",
      "refunded",
    ]);
    if (ineligible.has(status)) {
      throw new HttpException(
        "Order item cannot accept cancellation request",
        400,
      );
    }
    const createdAt = toISOStringSafe(new Date());
    const created = await tx.shopping_mall_cancellation_requests.create({
      data: {
        id: v4(),
        shopping_mall_order_item_id: orderItem.id,
        reason: body.reason,
        requested_at: createdAt,
        status: typia.assert<"requested">("requested"),
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    return created as unknown as IShoppingMallCancellationRequest;
  });
}
