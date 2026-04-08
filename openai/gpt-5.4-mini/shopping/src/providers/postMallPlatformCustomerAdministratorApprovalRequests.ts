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
import { MallPlatformAdministratorApprovalRequestCollector } from "../collectors/MallPlatformAdministratorApprovalRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformAdministratorApprovalRequestTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerAdministratorApprovalRequests(props: {
  customer: CustomerPayload;
  body: IMallPlatformAdministratorApprovalRequest.ICreate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing =
      await prisma.mall_platform_administrator_approval_requests.findFirst({
        where: {
          administrator_id: props.customer.id,
          status: "pending",
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (existing !== null) {
      throw new HttpException(
        "Duplicate pending administrator approval request",
        409,
      );
    }
    const created =
      await prisma.mall_platform_administrator_approval_requests.create({
        data: await MallPlatformAdministratorApprovalRequestCollector.collect({
          body: props.body,
          administrator: {
            id: props.customer.id,
          },
        }),
        ...MallPlatformAdministratorApprovalRequestTransformer.select(),
      });
    return await MallPlatformAdministratorApprovalRequestTransformer.transform(
      created,
    );
  });
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
// export async function postMallPlatformCustomerAdministratorApprovalRequests(props: {
//   customer: CustomerPayload;
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