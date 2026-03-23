import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceMallSellerOrdersOrderIdItemsOrderItemIdCancelReject(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        id: props.orderItemId,
        status: "pending",
        seller_id: props.seller.id,
      },
      include: {
        orderItem: true,
        customer: true,
        seller: true,
        snapshots: {
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
      },
    });
  if (!cancellationRequest) {
    throw new HttpException(
      "Cancellation request not found or not in pending status",
      404,
    );
  }
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
      where: {
        id: cancellationRequest.id,
      },
      data: {
        status: "rejected",
        responded_at: new Date(),
        reason: props.body.reason,
        updated_at: new Date(),
      },
      include: {
        orderItem: true,
        customer: true,
        seller: true,
      },
    });
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_cancellation_request_id: updatedRequest.id,
        seller_id: props.seller.id as string & tags.Format<"uuid">,
        reason: updatedRequest.reason,
        status: "rejected",
        responded_at: updatedRequest.responded_at,
        rejection_reason: props.body.reason,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  return {
    id: updatedRequest.id as string & tags.Format<"uuid">,
    reason: updatedRequest.reason,
    status: typia.assert<"pending" | "approved" | "rejected">(
      updatedRequest.status,
    ),
    responded_at: updatedRequest.responded_at
      ? toISOStringSafe(updatedRequest.responded_at)
      : null,
    created_at: toISOStringSafe(updatedRequest.created_at),
    updated_at: toISOStringSafe(updatedRequest.updated_at),
    deleted_at: updatedRequest.deleted_at
      ? toISOStringSafe(updatedRequest.deleted_at)
      : null,
    orderItem: {
      id: updatedRequest.orderItem.id as string & tags.Format<"uuid">,
      quantity: updatedRequest.orderItem.quantity,
      product_name: updatedRequest.orderItem.product_name,
      variant_options: updatedRequest.orderItem.variant_options,
      product_price: updatedRequest.orderItem.product_price,
      item_status: updatedRequest.orderItem.item_status as
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
      product: {
        id: updatedRequest.orderItem.product_id as string & tags.Format<"uuid">,
        name: updatedRequest.orderItem.product_name,
        base_price: updatedRequest.orderItem.product_price,
        is_available: true,
        created_at: toISOStringSafe(updatedRequest.orderItem.created_at),
        seller: {
          id: updatedRequest.orderItem.seller_id as string &
            tags.Format<"uuid">,
          shop_name: "",
          approval_status: "pending",
          is_suspended: false,
          created_at: toISOStringSafe(updatedRequest.orderItem.created_at),
        },
        main_image: {
          id: v4(),
          image_url: "",
          sort_order: 0,
          is_main: true,
          created_at: toISOStringSafe(updatedRequest.orderItem.created_at),
          updated_at: toISOStringSafe(updatedRequest.orderItem.created_at),
          deleted_at: null,
        },
      },
      variant: {
        id: updatedRequest.orderItem.variant_id as string & tags.Format<"uuid">,
        sku_code: "",
        price_override: 0,
        stock_quantity: 0,
      },
      seller: {
        id: updatedRequest.orderItem.seller_id as string & tags.Format<"uuid">,
        shop_name: "",
        approval_status: "pending",
        is_suspended: false,
        created_at: toISOStringSafe(updatedRequest.orderItem.created_at),
      },
    },
    customer: {
      id: updatedRequest.customer.id as string & tags.Format<"uuid">,
      email: updatedRequest.customer.email,
      is_suspended: false,
      created_at: toISOStringSafe(updatedRequest.customer.created_at),
    },
    seller: {
      id: updatedRequest.seller.id as string & tags.Format<"uuid">,
      shop_name: updatedRequest.seller.shop_name,
      approval_status: updatedRequest.seller.approval_status,
      is_suspended: updatedRequest.seller.is_suspended,
      created_at: toISOStringSafe(updatedRequest.seller.created_at),
    },
  };
}
