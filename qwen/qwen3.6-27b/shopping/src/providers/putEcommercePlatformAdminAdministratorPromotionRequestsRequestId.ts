import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer } from "../transformers/EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformAdminAdministratorPromotionRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate;
}): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
  const adminRecord =
    await MyGlobal.prisma.ecommerce_platform_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, is_super: true },
    });
  if (!adminRecord.is_super) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { id: true, status: true },
      },
    );
  if (existing.status !== "pending") {
    throw new HttpException("Request already processed", 409);
  }
  if (props.body.status === "rejected" && !props.body.rejectionReason?.trim()) {
    throw new HttpException("Rejection reason is required", 400);
  }
  const updated =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: props.body.status,
          reviewed_by_admin_id: props.admin.id,
          rejection_reason:
            props.body.status === "approved"
              ? null
              : props.body.rejectionReason,
          reviewed_at: new Date(),
          updated_at: new Date(),
        },
        ...EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.select(),
      },
    );
  return await EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.transform(
    updated,
  );
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
// import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformAdminAdministratorPromotionRequestsRequestId(props: {
//   admin: AdminPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate;
// }): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
//   await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.select(),
//   });
//   return await EcommercePlatformAdministratorPromotionRequestOfCustomerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------