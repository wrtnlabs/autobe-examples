import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdItemsItemIdRefundApprove(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IApprove;
}): Promise<IShoppingMallRefundRequest> {
  const now = new Date();
  // Find the refund request with all necessary relations
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      ...ShoppingMallRefundRequestTransformer.select(),
      where: {
        shopping_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  // Verify status is pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 409);
  }
  // Verify order item status is delivered
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException("Order item status is not delivered", 400);
  }
  // Verify seller owns the product variant
  if (refundRequest.orderItem.seller.id !== props.seller.id) {
    throw new HttpException("You do not own this product variant", 403);
  }
  // Begin transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Update refund request to approved
    const updatedRefundRequest = await tx.shopping_mall_refund_requests.update({
      where: { id: refundRequest.id },
      data: {
        status: "approved",
        shopping_mall_seller_id: props.seller.id,
        shopping_mall_seller_session_id: props.seller.session_id,
        responded_at: now,
        updated_at: now,
      },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
    // 2. Update order item status to refunded
    await tx.shopping_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    // 3. Create inventory record to restore stock
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          refundRequest.orderItem.productVariant.id,
        quantity_change: refundRequest.orderItem.quantity,
        reason: `Refund for order item ${props.itemId}`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // 4. Create snapshot of the refund request state change
    await tx.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_refund_request_id: refundRequest.id,
        shopping_mall_seller_id: props.seller.id,
        shopping_mall_customer_session_id: refundRequest.customerSession.id,
        status_before: "pending",
        status_after: "approved",
        response_text: props.body.responseText,
        created_at: now,
      },
    });
    // 5. Update parent order's updated_at timestamp
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        updated_at: now,
      },
    });
    return updatedRefundRequest;
  });
  return await ShoppingMallRefundRequestTransformer.transform(result);
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
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerOrdersOrderIdItemsItemIdRefundApprove(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallRefundRequest.IApprove;
// }): Promise<IShoppingMallRefundRequest> {
//   const record = await MyGlobal.prisma.shopping_mall_refund_requests.findFirstOrThrow({
//     ...ShoppingMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------