import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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

export async function postEcommerceMallSellerSellersMeCancellationRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Query cancellation request by id
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          ecommerce_mall_order_item_id: true,
          ecommerce_mall_seller_id: true,
          reason: true,
          status: true,
        },
      },
    );
  // 2. Validate status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "The cancellation request has already been processed",
      400,
    );
  }
  // 3. Validate seller owns this cancellation request
  if (cancellationRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You are not authorized to approve this cancellation request",
      403,
    );
  }
  // 4. Query order item and validate status is 'paid'
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: { id: cancellationRequest.ecommerce_mall_order_item_id },
      select: {
        id: true,
        status: true,
      },
    });
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation can only be requested for items that have not yet been shipped",
      400,
    );
  }
  // 5. Execute transaction
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction([
    // Update cancellation request status to 'approved'
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    }),
    // Create snapshot record
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_cancellation_request_id: props.requestId,
        reason: cancellationRequest.reason,
        status: "approved",
        created_at: new Date(),
      },
    }),
    // Update order item status to 'cancelled'
    MyGlobal.prisma.ecommerce_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    }),
  ]);
  // 6. Return transformed response
  return {
    reason: cancellationRequest.reason,
  } satisfies IEcommerceMallCancellationRequest;
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellersMeCancellationRequestsRequestIdApprove(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------