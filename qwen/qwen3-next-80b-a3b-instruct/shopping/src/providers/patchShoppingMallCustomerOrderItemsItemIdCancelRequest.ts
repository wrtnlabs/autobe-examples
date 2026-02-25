import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemsItemIdCancelRequest(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IShoppingMallCancellationRequest> {
  // Validate order item exists and has status 'paid'
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { status: true },
    });
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cannot cancel order item with status other than paid",
      403,
    );
  }
  // Create cancellation request with consistent timestamps
  const now = toISOStringSafe(new Date());
  const cancellation =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: v4(),
        order_item_id: props.itemId,
        customer_id: props.customer.id,
        reason: props.body.reason,
        status: "pending",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  // Create immutable snapshot of the request
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      cancellation_request_id: cancellation.id,
      reason: cancellation.reason,
      status: cancellation.status,
      response_reason: cancellation.response_reason,
      changed_at: toISOStringSafe(new Date()),
      changed_by: "customer",
    },
  });
  return await ShoppingMallCancellationRequestTransformer.transform(
    cancellation,
  );
}
