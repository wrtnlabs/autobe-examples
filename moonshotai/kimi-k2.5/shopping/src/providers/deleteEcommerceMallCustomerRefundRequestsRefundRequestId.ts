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

export async function deleteEcommerceMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string;
}): Promise<void> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (refundRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - Refund request does not belong to authenticated customer",
      403,
    );
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Cannot cancel a refund request that has already been responded to",
      400,
    );
  }
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request has already been cancelled", 400);
  }
  await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
// export async function deleteEcommerceMallCustomerRefundRequestsRefundRequestId(props: {
//   customer: CustomerPayload;
//   refundRequestId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------