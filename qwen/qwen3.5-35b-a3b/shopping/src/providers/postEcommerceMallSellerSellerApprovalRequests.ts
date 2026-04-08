import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerApprovalRequestCollector } from "../collectors/EcommerceMallSellerApprovalRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerApprovalRequestTransformer } from "../transformers/EcommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerApprovalRequest.ICreate;
}): Promise<IEcommerceMallSellerApprovalRequest> {
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findFirst({
      where: {
        seller_id: props.seller.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Seller already has an active pending approval request",
      409,
    );
  }
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.create({
      data: await EcommerceMallSellerApprovalRequestCollector.collect({
        body: props.body,
        ecommerceMallSellers: { id: props.seller.id },
      }),
      ...EcommerceMallSellerApprovalRequestTransformer.select(),
    });
  return await EcommerceMallSellerApprovalRequestTransformer.transform(record);
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
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellerApprovalRequests(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerApprovalRequest.ICreate;
// }): Promise<IEcommerceMallSellerApprovalRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.create({
//     data: await EcommerceMallSellerApprovalRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallSellerApprovalRequestTransformer.select(),
//   });
//   return await EcommerceMallSellerApprovalRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------