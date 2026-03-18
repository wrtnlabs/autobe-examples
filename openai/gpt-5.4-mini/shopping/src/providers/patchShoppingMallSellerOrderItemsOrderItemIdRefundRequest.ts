import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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

export async function patchShoppingMallSellerOrderItemsOrderItemIdRefundRequest(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IProcess;
}): Promise<IShoppingMallRefundRequest> {
  if (props.body.decision !== "approve" && props.body.decision !== "reject") {
    throw new HttpException("Invalid refund decision", 400);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        quantity: true,
        status: true,
        refunded_at: true,
        productVariant: {
          select: {
            id: true,
            product: {
              select: {
                seller: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        refundRequests: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  if (orderItem.productVariant.product.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const refundRequest = orderItem.refundRequests[0];
  if (refundRequest === undefined) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request already processed", 409);
  }
  const reviewedAt = new Date().toISOString();
  const reviewedReason = props.body.reviewedReason ?? null;
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const locked = await prisma.shopping_mall_refund_requests.updateMany({
      where: {
        id: refundRequest.id,
        status: "pending",
      },
      data: {
        status: props.body.decision === "approve" ? "approved" : "rejected",
        reviewed_reason: reviewedReason,
      },
    });
    if (locked.count !== 1) {
      throw new HttpException("Refund request already processed", 409);
    }
    await prisma.shopping_mall_refund_requests.update({
      where: { id: refundRequest.id },
      data: {
        reviewed_at: reviewedAt,
        updated_at: reviewedAt,
      },
    });
    if (props.body.decision === "approve") {
      if (orderItem.status === "refunded" || orderItem.refunded_at !== null) {
        throw new HttpException("Refund request already processed", 409);
      }
      await prisma.shopping_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          status: "refunded",
          refunded_at: reviewedAt,
          updated_at: reviewedAt,
        },
      });
      await prisma.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: orderItem.productVariant.id,
          quantity_change: orderItem.quantity,
          reason: "refund-restoration",
          occurred_at: reviewedAt,
          created_at: reviewedAt,
          updated_at: reviewedAt,
          deleted_at: null,
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequest.id },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
