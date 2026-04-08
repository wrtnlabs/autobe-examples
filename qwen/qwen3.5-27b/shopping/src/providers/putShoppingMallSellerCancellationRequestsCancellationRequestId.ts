import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  // Find the cancellation request with order item details
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          shopping_mall_order_item_id: true,
          orderItem: {
            select: {
              id: true,
              status: true,
              shopping_mall_seller_id: true,
              shopping_mall_product_variant_id: true,
              quantity: true,
            },
          },
        },
      },
    );
  // Validate that the cancellation request is in pending status
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // Validate that the seller owns the order item
  if (
    cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate that the order item is in paid status (not yet shipped)
  if (cancellationRequest.orderItem.status !== "paid") {
    throw new HttpException("Order item has already been shipped", 400);
  }
  // Validate that status is provided in the request body
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  const newStatus = props.body.status;
  const responseReason = props.body.response_reason;
  // Update the cancellation request
  await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      status: newStatus,
      response_reason: responseReason,
      updated_at: new Date(),
    },
  });
  // Create a snapshot of the cancellation request
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_cancellation_request_id: props.cancellationRequestId,
      shopping_mall_seller_id: props.seller.id,
      status_before: "pending",
      status_after: newStatus,
      seller_response: responseReason,
      created_at: new Date(),
    },
  });
  // If approved, update order item status and restore inventory
  if (newStatus === "approved") {
    // Update order item status to cancelled
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: cancellationRequest.orderItem.id },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    // Create inventory record to restore stock
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          cancellationRequest.orderItem.shopping_mall_product_variant_id,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: `Cancelled order item ${cancellationRequest.orderItem.id}`,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Return the updated cancellation request
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
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
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
//   seller: SellerPayload;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   body: IShoppingMallCancellationRequest.IUpdate;
// }): Promise<IShoppingMallCancellationRequest> {
//   await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCancellationRequestTransformer.select(),
//   });
//   return await ShoppingMallCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------