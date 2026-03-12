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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
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
        requested_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
            shopping_mall_order_id: true,
            status: true,
            quantity: true,
            price: true,
            product_snapshot: true,
            variant_snapshot: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
      },
    });
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: refundRequest.id,
    reason: refundRequest.reason,
    status: refundRequest.status,
    orderItem: {
      id: refundRequest.orderItem.id,
      orderId: refundRequest.orderItem.shopping_mall_order_id,
      status: refundRequest.orderItem.status,
      quantity: refundRequest.orderItem.quantity,
      price: refundRequest.orderItem.price,
      productSnapshot: refundRequest.orderItem.product_snapshot as {},
      variantSnapshot: refundRequest.orderItem.variant_snapshot as {},
      createdAt: refundRequest.orderItem.created_at.toISOString(),
    },
    customer: {
      id: refundRequest.customer.id,
      email: refundRequest.customer.email,
      display_name: refundRequest.customer.display_name,
      phone_number: refundRequest.customer.phone_number,
      status: refundRequest.customer.status,
      created_at: refundRequest.customer.created_at.toISOString(),
      updated_at: refundRequest.customer.updated_at.toISOString(),
      deleted_at: refundRequest.customer.deleted_at?.toISOString() ?? null,
    },
    requestedAt: refundRequest.requested_at.toISOString(),
    respondedAt: refundRequest.responded_at?.toISOString() ?? null,
    createdAt: refundRequest.created_at.toISOString(),
    updatedAt: refundRequest.updated_at.toISOString(),
  };
}
