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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorApprovalRequestsApprovalRequestIdDecisions(props: {
  administrator: AdministratorPayload;
  approvalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequest.ICreate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const caller =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: {
        id: true,
        grade: true,
      },
    });
  if (caller.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const request =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.approvalRequestId },
        select: {
          id: true,
          administrator_id: true,
          status: true,
          reason: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  throw new HttpException(
    "This endpoint contract does not provide an approval or rejection decision field. Cannot finalize administrator approval request without a decision discriminator.",
    400,
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
// export async function postMallPlatformAdministratorApprovalRequestsApprovalRequestIdDecisions(props: {
//   administrator: AdministratorPayload;
//   approvalRequestId: string & tags.Format<"uuid">;
//   body: IMallPlatformAdministratorApprovalRequest.ICreate;
// }): Promise<IMallPlatformAdministratorApprovalRequest> {
//   const record = await MyGlobal.prisma.mall_platform_administrator_approval_requests.create({
//     data: await MallPlatformAdministratorApprovalRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformAdministratorApprovalRequestTransformer.select(),
//   });
//   return await MallPlatformAdministratorApprovalRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------