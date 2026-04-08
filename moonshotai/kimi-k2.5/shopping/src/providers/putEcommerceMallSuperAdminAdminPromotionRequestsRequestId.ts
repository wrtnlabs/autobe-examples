import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
  body: IEcommerceMallAdminPromotionRequest.IUpdate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          reason: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reviewer_id: true,
          customerSubtype: {
            select: {
              customer: {
                select: {
                  id: true,
                  email: true,
                },
              } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
            },
          } satisfies Prisma.ecommerce_mall_admin_promotion_request_customersFindManyArgs,
          sellerRequest: {
            select: {
              seller: {
                select: {
                  id: true,
                  email: true,
                },
              } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
            },
          } satisfies Prisma.ecommerce_mall_admin_promotion_request_sellersFindManyArgs,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Only pending requests can be reviewed", 400);
  }
  const newStatus = props.body.status;
  if (newStatus === undefined) {
    throw new HttpException("status is required", 400);
  }
  if (newStatus === "approved") {
    if (
      props.body.rejectionReason !== undefined &&
      props.body.rejectionReason !== null
    ) {
      throw new HttpException(
        "rejection_reason must not be provided when approving",
        400,
      );
    }
  }
  if (newStatus === "rejected") {
    if (
      props.body.rejectionReason === undefined ||
      props.body.rejectionReason === null ||
      props.body.rejectionReason === ""
    ) {
      throw new HttpException(
        "rejection_reason is required when rejecting",
        400,
      );
    }
  }
  const nowIso: string = new Date().toISOString();
  const snapshotId: string = v4();
  const adminId: string = v4();
  const rejectionReasonValue: string | null =
    newStatus === "rejected" &&
    props.body.rejectionReason !== undefined &&
    props.body.rejectionReason !== null
      ? props.body.rejectionReason
      : null;
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
    where: { id: props.requestId },
    data: {
      reviewer_id: props.superAdmin.id,
      status: newStatus,
      rejection_reason: rejectionReasonValue,
      updated_at: nowIso,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.create(
    {
      data: {
        id: snapshotId,
        admin_promotion_request_id: props.requestId,
        previous_reviewer_id: request.reviewer_id,
        new_reviewer_id: props.superAdmin.id,
        previous_status: request.status,
        new_status: newStatus,
        previous_reason: request.reason,
        new_reason: rejectionReasonValue ?? request.reason,
        created_at: nowIso,
      },
    },
  );
  if (newStatus === "approved") {
    let requesterEmail: string | null = null;
    let requesterId: string | null = null;
    if (
      request.customerSubtype !== null &&
      request.customerSubtype.customer !== null
    ) {
      requesterEmail = request.customerSubtype.customer.email;
      requesterId = request.customerSubtype.customer.id;
    } else if (
      request.sellerRequest !== null &&
      request.sellerRequest.seller !== null
    ) {
      requesterEmail = request.sellerRequest.seller.email;
      requesterId = request.sellerRequest.seller.id;
    }
    if (requesterEmail !== null && requesterId !== null) {
      const tempPassword: string = v4();
      const passwordHash: string = await PasswordUtil.hash(tempPassword);
      await MyGlobal.prisma.ecommerce_mall_admins.create({
        data: {
          id: adminId,
          email: requesterEmail,
          password_hash: passwordHash,
          grade: "regular",
          status: "active",
          created_at: nowIso,
          updated_at: nowIso,
        },
      });
    }
  }
  const result =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(result);
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
// import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSuperAdminAdminPromotionRequestsRequestId(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string;
//   body: IEcommerceMallAdminPromotionRequest.IUpdate;
// }): Promise<IEcommerceMallAdminPromotionRequest> {
//   await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallAdminPromotionRequestTransformer.select(),
//   });
//   return await EcommerceMallAdminPromotionRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------