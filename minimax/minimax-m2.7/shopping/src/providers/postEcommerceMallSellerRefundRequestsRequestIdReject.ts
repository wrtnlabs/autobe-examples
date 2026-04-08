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

export async function postEcommerceMallSellerRefundRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IReject;
}): Promise<IEcommerceMallRefundRequest> {
  // 1. Find the refund request (must not be deleted)
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    });
  // 2. Verify status is 'pending'
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "This refund request has already been processed.",
      400,
    );
  }
  // 3. Verify seller owns this refund request
  if (refundRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Retrieve order item to verify status is 'delivered'
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: refundRequest.ecommerce_mall_order_item_id,
      },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "The order item must be delivered before processing the refund request.",
      400,
    );
  }
  // 5. Generate timestamp for consistency
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // 6. Update refund request: set status to 'rejected'
  await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      seller_response_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Create immutable snapshot for audit trail
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_refund_request_id: props.requestId,
        ecommerce_mall_customer_id: refundRequest.ecommerce_mall_customer_id,
        ecommerce_mall_seller_id: props.seller.id,
        snapshot_reason: refundRequest.reason,
        snapshot_status: "rejected",
        seller_response: "rejected",
        seller_response_reason: props.body.sellerResponseReason ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  // 8. Return transformed snapshot
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
// export async function postEcommerceMallSellerRefundRequestsRequestIdReject(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallRefundRequest.IReject;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------