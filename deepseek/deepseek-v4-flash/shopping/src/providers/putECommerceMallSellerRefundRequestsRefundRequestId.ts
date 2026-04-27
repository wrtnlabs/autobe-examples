import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallRefundRequestTransformer } from "../transformers/ECommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IECommerceMallRefundRequest.IUpdate;
}): Promise<IECommerceMallRefundRequest> {
  // 1. Fetch the refund request to validate ownership, status, and capture the reason
  const refundRequest =
    await MyGlobal.prisma.e_commerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        e_commerce_mall_seller_id: true,
        e_commerce_mall_order_item_id: true,
        status: true,
        reason: true,
      },
    });
  // 2. Ownership check — only the seller who owns the product variant can respond
  if (refundRequest.e_commerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Status check — only pending requests are eligible for a response
  if (refundRequest.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  // 4. Validate the decision value
  const decision = props.body.status;
  if (
    decision === undefined ||
    (decision !== "approved" && decision !== "rejected")
  ) {
    throw new HttpException("Invalid decision", 400);
  }
  const now = new Date().toISOString();
  // 5. Execute all mutations atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Update the refund request status and set response timestamp
    await tx.e_commerce_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: decision,
        response_timestamp: now,
        updated_at: now,
      },
    });
    // 5b. Create an immutable snapshot preserving the refund state at response time
    await tx.e_commerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        e_commerce_mall_refund_request_id: props.refundRequestId,
        reason: refundRequest.reason,
        status: decision,
        response_timestamp: now,
        created_at: now,
      },
    });
    // 5c. If approved: restore stock and update order item status to refunded
    if (decision === "approved") {
      const orderItem = await tx.e_commerce_mall_order_items.findUniqueOrThrow({
        where: { id: refundRequest.e_commerce_mall_order_item_id },
        select: {
          id: true,
          quantity: true,
          e_commerce_mall_product_variant_id: true,
        },
      });
      // Create a positive inventory record to restore the returned stock
      await tx.e_commerce_mall_inventory_records.create({
        data: {
          id: v4(),
          e_commerce_mall_product_variant_id:
            orderItem.e_commerce_mall_product_variant_id,
          quantity_change: orderItem.quantity,
          reason: "refund",
          created_at: now,
        },
      });
      // Transition the order item to refunded status
      await tx.e_commerce_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
    }
  });
  // 6. Read the updated record and transform to the response DTO
  const updated =
    await MyGlobal.prisma.e_commerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ECommerceMallRefundRequestTransformer.select(),
    });
  return await ECommerceMallRefundRequestTransformer.transform(updated);
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
// import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSellerRefundRequestsRefundRequestId(props: {
//   seller: SellerPayload;
//   refundRequestId: string & tags.Format<"uuid">;
//   body: IECommerceMallRefundRequest.IUpdate;
// }): Promise<IECommerceMallRefundRequest> {
//   await MyGlobal.prisma.e_commerce_mall_refund_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_refund_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallRefundRequestTransformer.select(),
//   });
//   return await ECommerceMallRefundRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------