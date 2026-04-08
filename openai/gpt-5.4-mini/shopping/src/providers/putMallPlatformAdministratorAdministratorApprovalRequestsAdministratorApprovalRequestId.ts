import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestId(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequest.IUpdate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const current =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorApprovalRequestId },
        select: {
          id: true,
          administrator_id: true,
          reviewer_administrator_id: true,
          reason: true,
          status: true,
          rejection_reason: true,
          reviewed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (current.status !== "pending") {
    throw new HttpException(
      "This administrator approval request has already been processed.",
      409,
    );
  }
  if (
    props.body.status === "rejected" &&
    (props.body.rejectionReason === undefined ||
      props.body.rejectionReason === null ||
      props.body.rejectionReason.trim().length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting an administrator approval request.",
      400,
    );
  }
  const updateData: {
    status: "approved" | "rejected";
    rejection_reason: string | null;
    reviewer_administrator_id: string & tags.Format<"uuid">;
    reviewed_at?: string & tags.Format<"date-time">;
    updated_at?: string & tags.Format<"date-time">;
  } = {
    status: props.body.status,
    rejection_reason:
      props.body.status === "rejected"
        ? (props.body.rejectionReason ?? null)
        : null,
    reviewer_administrator_id:
      props.body.reviewerAdministratorId ?? props.administrator.id,
  };
  if (props.body.reviewedAt !== undefined && props.body.reviewedAt !== null) {
    updateData.reviewed_at = props.body.reviewedAt;
    updateData.updated_at = props.body.reviewedAt;
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const locked =
      await prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
        {
          where: { id: props.administratorApprovalRequestId },
          select: {
            id: true,
            administrator_id: true,
            status: true,
          },
        },
      );
    if (locked.status !== "pending") {
      throw new HttpException(
        "This administrator approval request has already been processed.",
        409,
      );
    }
    await prisma.mall_platform_administrator_approval_requests.update({
      where: { id: props.administratorApprovalRequestId },
      data: updateData,
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorApprovalRequestId },
        ...MallPlatformAdministratorApprovalRequestTransformer.select(),
      },
    );
  return await MallPlatformAdministratorApprovalRequestTransformer.transform(
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
// import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestId(props: {
//   administrator: AdministratorPayload;
//   administratorApprovalRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformAdministratorApprovalRequest.IUpdate;
// }): Promise<IMallPlatformAdministratorApprovalRequest> {
//   await MyGlobal.prisma.mall_platform_administrator_approval_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformAdministratorApprovalRequestTransformer.select(),
//   });
//   return await MallPlatformAdministratorApprovalRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------