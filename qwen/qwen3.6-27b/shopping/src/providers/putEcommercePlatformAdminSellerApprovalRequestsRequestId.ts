import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSellerApprovalRequestTransformer } from "../transformers/EcommercePlatformSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformAdminSellerApprovalRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSellerApprovalRequest.IUpdate;
}): Promise<IEcommercePlatformSellerApprovalRequest> {
  const existing =
    await MyGlobal.prisma.ecommerce_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          status: "pending",
          deleted_at: null,
        } satisfies Prisma.ecommerce_platform_seller_approval_requestsWhereUniqueInput,
      },
    );
  if (
    props.body.status === "rejected" &&
    (!props.body.reason || props.body.reason.trim().length === 0)
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  await MyGlobal.prisma.ecommerce_platform_seller_approval_requests.update({
    where: { id: props.requestId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.status === "approved" && { reason: null }),
      ...(props.body.status === "rejected" && { reason: props.body.reason }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommercePlatformSellerApprovalRequestTransformer.select(),
      },
    );
  return await EcommercePlatformSellerApprovalRequestTransformer.transform(
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
// import { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformAdminSellerApprovalRequestsRequestId(props: {
//   admin: AdminPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSellerApprovalRequest.IUpdate;
// }): Promise<IEcommercePlatformSellerApprovalRequest> {
//   await MyGlobal.prisma.ecommerce_platform_seller_approval_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_seller_approval_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformSellerApprovalRequestTransformer.select(),
//   });
//   return await EcommercePlatformSellerApprovalRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------