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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemsOrderItemIdRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        customer_id: true,
        order_item_id: true,
        reason: true,
        status: true,
        response_reason: true,
        requested_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    });
  if (refundRequest.order_item_id !== props.orderItemId) {
    throw new HttpException("Not Found", 404);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { shopping_mall_seller_id: true },
    });
  const isRequester = refundRequest.customer_id === props.customer.id;
  const isSeller = orderItem.shopping_mall_seller_id === props.customer.id;
  if (!isRequester && !isSeller) {
    throw new HttpException("Forbidden", 403);
  }
  const payload = {
    id: refundRequest.id,
    reason: refundRequest.reason,
    status: refundRequest.status,
    response_reason: refundRequest.response_reason ?? null,
    requested_at: refundRequest.requested_at.toISOString(),
    responded_at: refundRequest.responded_at?.toISOString() ?? null,
    created_at: refundRequest.created_at.toISOString(),
    updated_at: refundRequest.updated_at.toISOString(),
    deleted_at: refundRequest.deleted_at?.toISOString() ?? null,
    orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
      refundRequest.orderItem,
    ),
    customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
      refundRequest.customer,
    ),
    seller: refundRequest.seller
      ? await ShoppingMallSellerAtSummaryTransformer.transform(
          refundRequest.seller,
        )
      : null,
  } satisfies IShoppingMallRefundRequest;
  return payload;
}
