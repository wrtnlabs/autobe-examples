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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformAdministratorApprovalRequestTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IMallPlatformAdministratorApprovalRequest.ICreate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const record = await MyGlobal.prisma.$transaction(async (prisma) => {
    const seller = await prisma.mall_platform_sellers.findFirst({
      where: {
        id: props.seller.id,
      },
      select: {
        id: true,
      },
    });
    if (seller === null) throw new HttpException("Forbidden", 403);
    const existing =
      await prisma.mall_platform_administrator_approval_requests.findFirst({
        where: {
          administrator_id: props.seller.id,
          deleted_at: null,
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (existing !== null) throw new HttpException("Conflict", 409);
    return await prisma.mall_platform_administrator_approval_requests.create({
      data: await MallPlatformAdministratorApprovalRequestCollector.collect({
        body: props.body,
        administrator: props.seller,
      }),
      ...MallPlatformAdministratorApprovalRequestTransformer.select(),
    });
  });
  return await MallPlatformAdministratorApprovalRequestTransformer.transform(
    record,
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
// export async function postMallPlatformSellerApprovalRequests(props: {
//   seller: SellerPayload;
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