import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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

export async function putShoppingMallSellerRefundRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        status: true,
        reason: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            status: true,
            quantity: true,
            shopping_mall_product_variant_id: true,
            shopping_mall_order_id: true,
            productVariant: {
              select: {
                id: true,
                product: {
                  select: {
                    id: true,
                    shopping_mall_seller_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request has been deleted", 409);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request has already been responded to",
      409,
    );
  }
  if (
    refundRequest.orderItem.productVariant.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException("Order item is not in delivered status", 409);
  }
  const newStatus: string = props.body.status;
  if (newStatus !== "approved" && newStatus !== "rejected") {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: newStatus,
        responded_at: now,
        updated_at: now,
      },
    });
    if (newStatus === "approved") {
      await tx.shopping_mall_order_items.update({
        where: { id: refundRequest.orderItem.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          variant: {
            connect: {
              id: refundRequest.orderItem.shopping_mall_product_variant_id,
            },
          },
          quantity_change: refundRequest.orderItem.quantity,
          reason: `Refund approved for refund request ${props.requestId}`,
          created_at: now,
        },
      });
    }
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refundRequest: { connect: { id: props.requestId } },
        seller: { connect: { id: props.seller.id } },
        reason: refundRequest.reason,
        status: newStatus,
        created_at: now,
      },
    });
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: refundRequest.orderItem.shopping_mall_order_id,
      },
      select: { status: true },
    });
    const statuses: string[] = orderItems.map((item) => item.status);
    let orderStatus: string;
    if (statuses.every((s) => s === "paid")) {
      orderStatus = "paid";
    } else if (
      statuses.some((s) => s === "shipped") &&
      !statuses.some((s) => ["delivered", "cancelled", "refunded"].includes(s))
    ) {
      orderStatus = "shipped";
    } else if (statuses.every((s) => s === "delivered")) {
      orderStatus = "delivered";
    } else if (statuses.every((s) => s === "cancelled")) {
      orderStatus = "cancelled";
    } else if (statuses.every((s) => s === "refunded")) {
      orderStatus = "refunded";
    } else {
      orderStatus = "partially_completed";
    }
    await tx.shopping_mall_orders.update({
      where: { id: refundRequest.orderItem.shopping_mall_order_id },
      data: {
        status: orderStatus,
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerRefundRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IShoppingMallRefundRequest.IUpdate;
// }): Promise<IShoppingMallRefundRequest> {
//   await MyGlobal.prisma.shopping_mall_refund_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallRefundRequestTransformer.select(),
//   });
//   return await ShoppingMallRefundRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------