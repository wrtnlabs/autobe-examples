import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerRefundRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequest> {
  // Find the refund request and verify seller ownership
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        ecommerce_mall_customer_id: true,
        ecommerce_mall_order_item_id: true,
        reason: true,
        status: true,
      },
    });
  // Verify seller owns this refund request
  if (refundRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check that status is pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("The request has already been processed", 400);
  }
  // Get the order item for inventory restoration
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: refundRequest.ecommerce_mall_order_item_id,
      },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        quantity: true,
      },
    });
  // Execute transaction: approve refund, update order item, restore inventory, create snapshot
  const snapshot = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // 1. Update refund request status to approved
    await tx.ecommerce_mall_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        seller_response_at: now,
        updated_at: now,
      },
    });
    // 2. Update order item status to refunded
    await tx.ecommerce_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "refunded",
        updated_at: now,
      },
    });
    // 3. Create inventory record to restore stock (positive quantity change for refund)
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id:
          orderItem.ecommerce_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "refund",
        created_at: now,
      },
    });
    // 4. Create refund request snapshot for audit trail
    const createdSnapshot =
      await tx.ecommerce_mall_refund_request_snapshots.create({
        data: {
          id: v4(),
          ecommerce_mall_refund_request_id: props.requestId,
          ecommerce_mall_customer_id: refundRequest.ecommerce_mall_customer_id,
          ecommerce_mall_seller_id: props.seller.id,
          snapshot_reason: refundRequest.reason,
          snapshot_status: "approved",
          seller_response: "approved",
          seller_response_reason: null,
          created_at: now,
          updated_at: now,
        },
        ...EcommerceMallRefundRequestTransformer.select(),
      });
    return createdSnapshot;
  });
  return await EcommerceMallRefundRequestTransformer.transform(snapshot);
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerRefundRequestsRequestIdApprove(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------