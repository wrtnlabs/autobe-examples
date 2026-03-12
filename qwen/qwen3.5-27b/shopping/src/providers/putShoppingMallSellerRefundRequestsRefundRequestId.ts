import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        shopping_mall_order_item_id: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not pending", 409);
  }
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_refund_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_refund_request_id: refundRequest.id,
      snapshot_data: JSON.stringify({
        reason: refundRequest.reason,
        status_before: refundRequest.status,
        status_after: props.body.status,
        responded_at: now.toISOString(),
      }),
      created_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: refundRequest.id },
    data: {
      status: props.body.status,
      responded_at: now,
      updated_at: now,
    },
  });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: refundRequest.shopping_mall_order_item_id },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
