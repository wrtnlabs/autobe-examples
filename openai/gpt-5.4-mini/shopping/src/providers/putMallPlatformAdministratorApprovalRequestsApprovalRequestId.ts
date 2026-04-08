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

export async function putMallPlatformAdministratorApprovalRequestsApprovalRequestId(props: {
  administrator: AdministratorPayload;
  approvalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequest.IUpdate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        id: true,
        grade: true,
      },
    });
  if (administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const current =
      await prisma.mall_platform_administrator_approval_requests.findUnique({
        where: { id: props.approvalRequestId },
        select: {
          id: true,
          status: true,
        },
      });
    if (current === null) {
      throw new HttpException("Not Found", 404);
    }
    if (current.status !== "pending") {
      throw new HttpException("This request cannot be processed again.", 409);
    }
    await prisma.mall_platform_administrator_approval_requests.update({
      where: { id: props.approvalRequestId },
      data: {
        status: props.body.status,
        ...(props.body.rejectionReason !== undefined
          ? { rejection_reason: props.body.rejectionReason }
          : {}),
        ...(props.body.reviewerAdministratorId !== undefined
          ? { reviewer_administrator_id: props.body.reviewerAdministratorId }
          : {}),
      },
    });
    return await prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.approvalRequestId },
        ...MallPlatformAdministratorApprovalRequestTransformer.select(),
      },
    );
  });
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
// export async function putMallPlatformAdministratorApprovalRequestsApprovalRequestId(props: {
//   administrator: AdministratorPayload;
//   approvalRequestId: string & tags.Format<"uuid">;
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