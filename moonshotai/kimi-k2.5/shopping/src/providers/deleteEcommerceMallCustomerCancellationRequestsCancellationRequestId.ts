import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string;
}): Promise<void> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
          status: true,
          deleted_at: true,
        },
      },
    );
  if (cancellationRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (cancellationRequest.deleted_at !== null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cannot delete cancellation request that has already been processed",
      400,
    );
  }
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      deleted_at: now,
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallCustomerCancellationRequestsCancellationRequestId(props: {
//   customer: CustomerPayload;
//   cancellationRequestId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------