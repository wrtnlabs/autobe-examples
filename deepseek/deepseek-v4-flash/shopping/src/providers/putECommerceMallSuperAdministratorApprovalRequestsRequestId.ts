import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSellerApprovalRequestTransformer } from "../transformers/ECommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallSuperAdministratorApprovalRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IECommerceMallSellerApprovalRequest.IUpdate;
}): Promise<IECommerceMallSellerApprovalRequest> {
  const request =
    await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          seller_id: true,
          seller: {
            select: {
              id: true,
              approval_status: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  if (request.seller.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Conflict", 422);
  }
  const nowIso: string = new Date().toISOString();
  if (props.body.status === "approved") {
    if (
      props.body.rejection_reason !== undefined &&
      props.body.rejection_reason !== null
    ) {
      throw new HttpException(
        "Rejection reason must be empty when approving",
        422,
      );
    }
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.e_commerce_mall_seller_approval_requests.update({
        where: { id: props.requestId },
        data: {
          status: "approved",
          reviewer_id: props.superAdministrator.id,
          reviewed_at: nowIso,
          rejection_reason: null,
          updated_at: nowIso,
        },
      });
      await tx.e_commerce_mall_sellers.update({
        where: { id: request.seller_id },
        data: {
          approval_status: "approved",
          updated_at: nowIso,
        },
      });
    });
  } else if (props.body.status === "rejected") {
    if (
      props.body.rejection_reason === undefined ||
      props.body.rejection_reason === null ||
      props.body.rejection_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting",
        422,
      );
    }
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.e_commerce_mall_seller_approval_requests.update({
        where: { id: props.requestId },
        data: {
          status: "rejected",
          reviewer_id: props.superAdministrator.id,
          reviewed_at: nowIso,
          rejection_reason: props.body.rejection_reason,
          updated_at: nowIso,
        },
      });
      await tx.e_commerce_mall_sellers.update({
        where: { id: request.seller_id },
        data: {
          approval_status: "rejected",
          updated_at: nowIso,
        },
      });
    });
  } else {
    throw new HttpException("Status must be 'approved' or 'rejected'", 422);
  }
  const updated =
    await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ECommerceMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ECommerceMallSellerApprovalRequestTransformer.transform(updated);
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
// import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallSuperAdministratorApprovalRequestsRequestId(props: {
//   superAdministrator: SuperadministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IECommerceMallSellerApprovalRequest.IUpdate;
// }): Promise<IECommerceMallSellerApprovalRequest> {
//   await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallSellerApprovalRequestTransformer.select(),
//   });
//   return await ECommerceMallSellerApprovalRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------