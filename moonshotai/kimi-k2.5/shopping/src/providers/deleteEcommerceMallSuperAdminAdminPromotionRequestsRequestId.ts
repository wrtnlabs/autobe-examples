import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSuperAdminAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          deleted_at: true,
        },
      },
    );
  if (request.deleted_at !== null) {
    throw new HttpException("Request already deleted", 400);
  }
  if (request.status !== "pending") {
    throw new HttpException(
      `Cannot delete ${request.status} request. Only pending requests can be deleted.`,
      400,
    );
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: now,
      updated_at: now,
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
// export async function deleteEcommerceMallSuperAdminAdminPromotionRequestsRequestId(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------