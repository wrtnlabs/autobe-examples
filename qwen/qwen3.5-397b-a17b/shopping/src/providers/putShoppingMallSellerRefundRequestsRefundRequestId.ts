import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        order_item_id: true,
        reason: true,
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request has already been responded to",
      400,
    );
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.order_item_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund request can only be responded to for delivered order items",
      400,
    );
  }
  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      status: props.body.status,
      response_reason: props.body.response_reason ?? null,
      seller_id: props.seller.id,
      responded_at: new Date(),
      updated_at: new Date(),
    },
    ...ShoppingMallRefundRequestTransformer.select(),
  });
  await MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_refund_request_id: props.refundRequestId,
      reason: refundRequest.reason,
      status: props.body.status,
      seller_response: props.body.response_reason ?? null,
      responded_at: new Date(),
      created_at: new Date(),
    },
  });
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: refundRequest.order_item_id },
      data: {
        status: "refunded",
        updated_at: new Date(),
      },
    });
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        product_variant_id: orderItem.shopping_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "refund",
        created_at: new Date(),
      },
    });
  }
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
