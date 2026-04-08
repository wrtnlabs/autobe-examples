import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorApprovalRequestsTransformer } from "../transformers/EcommerceMallAdministratorApprovalRequestsTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorAdministratorApprovalRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdministratorApprovalRequests.IUpdate;
}): Promise<IEcommerceMallAdministratorApprovalRequests> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
      },
    );
  if (record.status !== "pending") {
    throw new HttpException("Request is not in pending status", 400);
  }
  const decision = props.body.status;
  const reviewReason = props.body.review_reason;
  if (
    decision === "rejected" &&
    (!reviewReason || reviewReason.trim().length === 0)
  ) {
    throw new HttpException("Review reason is required for rejection", 400);
  }
  let createdAdminId: string | null = null;
  if (decision === "approved") {
    const requestingMemberId = record.requestingMember?.id;
    const requestingSellerId = record.requestingSeller?.id;
    let createdAdminEmail: string;
    let createdAdminDisplayName: string;
    if (requestingMemberId !== undefined) {
      const member =
        await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow({
          where: { id: requestingMemberId },
          select: { email: true, display_name: true },
        });
      createdAdminEmail = member.email;
      createdAdminDisplayName = member.display_name ?? "Administrator";
    } else if (requestingSellerId !== undefined) {
      const seller =
        await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
          where: { id: requestingSellerId },
          select: { email: true, display_name: true },
        });
      createdAdminEmail = seller.email;
      createdAdminDisplayName = seller.display_name ?? "Administrator";
    } else {
      throw new HttpException("Unable to determine requester identity", 500);
    }
    const newAdminId = v4();
    await MyGlobal.prisma.ecommerce_mall_administrators.create({
      data: {
        id: newAdminId,
        email: createdAdminEmail,
        display_name: createdAdminDisplayName,
        grade: "regular" as const,
        is_banned: false,
        password_hash: await PasswordUtil.hash("temp"),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    createdAdminId = newAdminId;
  }
  await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.update({
    where: { id: props.requestId },
    data: {
      status: decision,
      reviewing_super_admin_id: props.superAdministrator.id,
      created_admin_id: createdAdminId,
      updated_at: new Date(),
    },
  });
  const snapshotId = v4();
  const requesterId =
    record.requestingMember?.id ??
    record.requestingSeller?.id ??
    "00000000-0000-0000-0000-000000000000";
  const requesterType =
    record.requestingMember !== null && record.requestingMember !== undefined
      ? "member"
      : "seller";
  const approvedGrade = decision === "approved" ? "regular" : null;
  const reviewReasonValue =
    decision === "rejected" ? (reviewReason ?? null) : null;
  await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests_snapshots.create(
    {
      data: {
        id: snapshotId,
        ecommerce_mall_administrator_approval_request_id: props.requestId,
        reviewed_by_administrator_id: props.superAdministrator.id,
        requester_id: requesterId,
        requester_type: requesterType,
        request_reason: record.reason,
        status: decision,
        approved_grade: approvedGrade,
        review_reason: reviewReasonValue,
        created_at: new Date(),
      },
    },
  );
  const updated =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
      },
    );
  return await EcommerceMallAdministratorApprovalRequestsTransformer.transform(
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
// import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorAdministratorApprovalRequestsRequestId(props: {
//   superAdministrator: SuperadministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdministratorApprovalRequests.IUpdate;
// }): Promise<IEcommerceMallAdministratorApprovalRequests> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findFirstOrThrow({
//     ...EcommerceMallAdministratorApprovalRequestsTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorApprovalRequestsTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------