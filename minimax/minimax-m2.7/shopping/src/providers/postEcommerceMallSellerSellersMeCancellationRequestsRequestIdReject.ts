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

export async function postEcommerceMallSellerSellersMeCancellationRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // Find the cancellation request with its order item
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          ecommerce_mall_seller_id: true,
          status: true,
          reason: true,
          orderItem: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    );
  // Validate that the authenticated seller owns this cancellation request
  if (record.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate that the cancellation request is in pending status
  if (record.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // Validate that the associated order item is in paid status
  if (record.orderItem.status !== "paid") {
    throw new HttpException("Order item is not in paid status", 400);
  }
  // Update the cancellation request status to rejected
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      updated_at: new Date(),
    },
  });
  // Create a snapshot of the cancellation request state at rejection time
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_cancellation_request_id: record.id,
      reason: record.reason,
      status: "rejected",
      created_at: new Date(),
    },
  });
  // Return the cancellation request (only reason field per DTO)
  return {
    reason: record.reason,
  };
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
// export async function postEcommerceMallSellerSellersMeCancellationRequestsRequestIdReject(props: {
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