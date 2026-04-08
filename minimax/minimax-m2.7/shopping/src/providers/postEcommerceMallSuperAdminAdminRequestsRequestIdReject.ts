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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminRequestOfCustomerTransformer } from "../transformers/EcommerceMallAdminRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminAdminRequestsRequestIdReject(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequestOfCustomer.IReject;
}): Promise<IEcommerceMallAdminRequestOfCustomer> {
  // Find the admin request
  const record =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
      ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    });
  // Verify request is in pending status
  if (record.status !== "pending") {
    throw new HttpException(
      "Cannot reject a request that is not in pending status",
      400,
    );
  }
  // Update the request to rejected status
  const updated = await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      reviewed_by_id: props.superAdmin.id,
      reviewed_reason: props.body.reviewedReason ?? null,
      updated_at: new Date(),
    },
    ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
  });
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
// export async function postEcommerceMallSuperAdminAdminRequestsRequestIdReject(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdminRequestOfCustomer.IReject;
// }): Promise<IEcommerceMallAdminRequestOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
//     ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminRequestOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------