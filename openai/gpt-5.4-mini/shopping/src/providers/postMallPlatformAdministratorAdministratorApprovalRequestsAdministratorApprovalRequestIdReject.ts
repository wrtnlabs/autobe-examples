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

export async function postMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdReject(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const record =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.administratorApprovalRequestId,
        },
        select: {
          id: true,
          status: true,
        },
      },
    );
  if (record.status !== "pending") {
    throw new HttpException(
      "The administrator approval request decision cannot be applied again.",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const updated =
      await prisma.mall_platform_administrator_approval_requests.updateMany({
        where: {
          id: props.administratorApprovalRequestId,
          status: "pending",
        },
        data: {
          status: "rejected",
          reviewer_administrator_id: props.administrator.id,
          reviewed_at: new Date(),
          updated_at: new Date(),
        },
      });
    if (updated.count !== 1) {
      throw new HttpException(
        "The administrator approval request decision cannot be applied again.",
        409,
      );
    }
  });
  const updated =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.administratorApprovalRequestId,
        },
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
// export async function postMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdReject(props: {
//   administrator: AdministratorPayload;
//   administratorApprovalRequestId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformAdministratorApprovalRequest> {
//   const record = await MyGlobal.prisma.mall_platform_administrator_approval_requests.findFirstOrThrow({
//     ...MallPlatformAdministratorApprovalRequestTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformAdministratorApprovalRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------