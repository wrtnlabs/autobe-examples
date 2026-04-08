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
  const current =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.approvalRequestId },
        select: {
          id: true,
          status: true,
        },
      },
    );
  if (current.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  const updatedAt = new Date().toISOString();
  await MyGlobal.prisma.mall_platform_administrator_approval_requests.update({
    where: { id: props.approvalRequestId },
    data: {
      status: props.body.status,
      rejection_reason: props.body.rejectionReason ?? null,
      reviewed_at: props.body.reviewedAt ?? null,
      updated_at: updatedAt,
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.approvalRequestId },
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