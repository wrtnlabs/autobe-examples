import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminRequestOfCustomerTransformer } from "../transformers/EcommerceMallAdminRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerAdminRequestsRequestIdCancel(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestOfCustomer> {
  // 1. Retrieve the admin request
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
    });
  // 2. Validate request status is 'pending'
  if (request.status !== "pending") {
    throw new HttpException("Only pending requests can be cancelled", 400);
  }
  // 3. Validate seller ownership - check actor_type is 'seller'
  if (request.actor_type !== "seller") {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Update request status to 'cancelled'
  const updated = await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: "cancelled",
      updated_at: new Date(),
    },
    ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
  });
  // 5. Return updated request
  return await EcommerceMallAdminRequestOfCustomerTransformer.transform(
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
// import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerAdminRequestsRequestIdCancel(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdminRequestOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
//     ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminRequestOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------