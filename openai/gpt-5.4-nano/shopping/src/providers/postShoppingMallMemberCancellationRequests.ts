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
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCancellationRequests(props: {
  member: MemberPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  const memberId = props.member.id;
  const orderItemId = props.body.orderItemId;
  const isoNow = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time">;
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const orderItem = await tx.shopping_mall_order_items.findFirstOrThrow({
      where: {
        id: orderItemId,
        deleted_at: null,
        order: {
          shopping_customer_id: memberId,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        line_item_status: true,
      },
    });
    const terminalStatuses = new Set<string>(["cancelled", "refunded"]);
    if (terminalStatuses.has(orderItem.line_item_status)) {
      throw new HttpException(
        "Order item cannot accept cancellation request",
        400,
      );
    }
    const existing = await tx.shopping_mall_cancellation_requests.findFirst({
      where: {
        shopping_mall_order_item_id: orderItemId,
        deleted_at: null,
        status: "pending",
      },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException("Cancellation request already pending", 409);
    }
    const record = await tx.shopping_mall_cancellation_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_item_id: orderItemId,
        reason: props.body.reason,
        requested_at: new Date(isoNow),
        status: "pending",
        seller_decisioned_at: null,
        seller_response_reason: null,
        created_at: new Date(isoNow),
        updated_at: new Date(isoNow),
        deleted_at: null,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reason: true,
        status: true,
        requested_at: true,
        seller_decisioned_at: true,
        seller_response_reason: true,
        shopping_mall_order_item_id: true,
        orderItem: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            placed_at: true,
            shopping_mall_order_id: true,
            seller_snapshot_id: true,
            shopping_mall_product_variant_id: true,
            shopping_mall_shipment_id: true,
            seller_price_at_purchase: true,
            quantity: true,
            line_item_status: true,
          },
        },
      },
    });
    return record;
  });
  return await ShoppingMallCancellationRequestTransformer.transform(created);
}
