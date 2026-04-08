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

export async function deleteEcommerceMallCustomerAdminPromotionRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUnique({
      where: {
        id: props.requestId,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindUniqueArgs);
  if (request === null) {
    throw new HttpException("Admin promotion request not found", 404);
  }
  if (request.deleted_at !== null) {
    throw new HttpException("Admin promotion request already deleted", 400);
  }
  if (request.status !== "pending") {
    throw new HttpException(
      `Cannot delete request with status '${request.status}'. Only pending requests can be deleted.`,
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
    where: {
      id: props.requestId,
    },
    data: {
      deleted_at: new Date().toISOString(),
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
// export async function deleteEcommerceMallCustomerAdminPromotionRequestsRequestId(props: {
//   customer: CustomerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------