import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderIdCancellationRequests(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const { seller, orderId, body } = props;

  const foundOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (!foundOrder) {
    throw new HttpException("Order not found", 404);
  }

  if (foundOrder.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }

  if (foundOrder.status === "cancelled") {
    throw new HttpException("Cannot cancel an already cancelled order", 400);
  }

  const now = toISOStringSafe(new Date());

  const id = v4() satisfies string as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id,
        shopping_mall_order_id: orderId,
        shopping_mall_customer_id: body.shopping_mall_customer_id,
        reason: body.reason,
        status: "pending",
        requested_at: now,
        processed_at: null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id satisfies string & tags.Format<"uuid">,
    shopping_mall_order_id: created.shopping_mall_order_id satisfies string &
      tags.Format<"uuid">,
    shopping_mall_customer_id:
      created.shopping_mall_customer_id satisfies string & tags.Format<"uuid">,
    reason: created.reason satisfies string,
    status: created.status as "pending" | "approved" | "rejected",
    requested_at: toISOStringSafe(created.requested_at) satisfies string &
      tags.Format<"date-time">,
    processed_at: null,
    created_at: toISOStringSafe(created.created_at) satisfies string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) satisfies string &
      tags.Format<"date-time">,
  };
}
