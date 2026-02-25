import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallOrderItemVariantOptionTransformer } from "../transformers/ShoppingMallOrderItemVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.refundRequestId },
        select: {
          id: true,
          customer_id: true,
          reason: true,
          status: true,
          seller_response: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          orderItem: {
            select: {
              id: true,
              status: true,
              quantity: true,
              unit_price: true,
              product_name: true,
              product_thumbnail_url: true,
              product_category_name: true,
              variant_sku_code: true,
              variant_price: true,
              seller_shop_name: true,
              created_at: true,
              order: ShoppingMallOrderAtSummaryTransformer.select(),
              variantOptions:
                ShoppingMallOrderItemVariantOptionTransformer.select(),
            },
          },
        },
      },
    );
  // Verify this is a refund request (order item must have 'delivered' status)
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException("This is not a refund request", 400);
  }
  // Verify customer ownership
  if (refundRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem = await ShoppingMallOrderItemAtSummaryTransformer.transform(
    refundRequest.orderItem,
  );
  return {
    id: refundRequest.id,
    orderItem,
    reason: refundRequest.reason,
    status: refundRequest.status as "pending" | "approved" | "rejected",
    sellerResponse: refundRequest.seller_response,
    rejectionReason: refundRequest.rejection_reason,
    createdAt: refundRequest.created_at.toISOString(),
    updatedAt: refundRequest.updated_at.toISOString(),
  } satisfies IShoppingMallRefundRequest;
}
