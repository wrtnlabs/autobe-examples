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
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerCancellationRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IReject;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Retrieve cancellation request by requestId
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        status: true,
        reason: true,
      },
    });
  // 2. Verify request exists (404 if not found)
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // 3. Verify status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      `Cannot reject cancellation request with status '${cancellationRequest.status}'. Only pending requests can be rejected.`,
      400,
    );
  }
  // 4. Verify seller owns the request
  if (cancellationRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Update cancellation request status to 'rejected'
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      updated_at: new Date(),
    },
  });
  // 6. Create immutable snapshot record with seller rejection reason
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_cancellation_request_id: props.requestId,
        reason: props.body.reason,
        status: "rejected",
        created_at: new Date(),
      },
    });
  // 7. Return snapshot with related entities using transformer
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: snapshot.id },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(record);
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
// export async function postEcommerceMallSellerCancellationRequestsRequestIdReject(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCancellationRequest.IReject;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------