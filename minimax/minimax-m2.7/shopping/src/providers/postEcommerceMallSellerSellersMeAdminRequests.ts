import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerAdminRequestCollector } from "../collectors/EcommerceMallSellerAdminRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAdminRequestTransformer } from "../transformers/EcommerceMallSellerAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellersMeAdminRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerAdminRequest.ICreate;
}): Promise<IEcommerceMallSellerAdminRequest> {
  // Validate seller account exists and is active
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: {
      id: true,
      approval_status: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Seller account not found", 404);
  }
  // Check for existing pending or approved admin requests
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.findFirst({
      where: {
        ecommerce_mall_seller_id: props.seller.id,
        status: { in: ["pending", "approved"] },
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "An admin request already exists for this seller",
      409,
    );
  }
  // Create the admin request
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.create({
      data: await EcommerceMallSellerAdminRequestCollector.collect({
        body: props.body,
        ecommerceMallSellers: seller,
        ecommerceMallSellerSessions: { id: props.seller.session_id },
      }),
      ...EcommerceMallSellerAdminRequestTransformer.select(),
    });
  return await EcommerceMallSellerAdminRequestTransformer.transform(record);
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
// import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellersMeAdminRequests(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallSellerAdminRequest.ICreate;
// }): Promise<IEcommerceMallSellerAdminRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.create({
//     data: await EcommerceMallSellerAdminRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallSellerAdminRequestTransformer.select(),
//   });
//   return await EcommerceMallSellerAdminRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------