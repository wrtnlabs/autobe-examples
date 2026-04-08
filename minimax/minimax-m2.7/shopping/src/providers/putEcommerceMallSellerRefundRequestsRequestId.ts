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

export async function putEcommerceMallSellerRefundRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  // Retrieve the refund request with order item and product info
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        status: true,
        reason: true,
        ecommerce_mall_customer_id: true,
        ecommerce_mall_seller_id: true,
        orderItem: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                ecommerce_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  // Verify the refund request is in pending status
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "This refund request has already been processed.",
      400,
    );
  }
  // Verify the authenticated seller owns the product
  if (
    refundRequest.orderItem.product.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // Update the refund request with seller's response
  await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.sellerResponse,
      seller_response_at: now,
      updated_at: now,
    },
  });
  // Create immutable snapshot capturing complete refund request state at response time
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_refund_request_id: props.requestId,
        ecommerce_mall_customer_id: refundRequest.ecommerce_mall_customer_id,
        ecommerce_mall_seller_id: props.seller.id,
        snapshot_reason: refundRequest.reason,
        snapshot_status: refundRequest.status,
        seller_response: props.body.sellerResponse,
        seller_response_reason: props.body.sellerResponse ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  // Retrieve the created snapshot with relations for transformation
  const updatedSnapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: snapshot.id },
        ...EcommerceMallRefundRequestTransformer.select(),
      },
    );
  return await EcommerceMallRefundRequestTransformer.transform(updatedSnapshot);
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
// export async function putEcommerceMallSellerRefundRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallRefundRequest.IUpdate;
// }): Promise<IEcommerceMallRefundRequest> {
//   await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallRefundRequestTransformer.select(),
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------