import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerSuspensionCollector } from "../collectors/EcommerceMallSellerSuspensionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function generateUuid(): string & tags.Format<"uuid"> {
  const uuid = v4();
  return uuid;
}
export async function postEcommerceMallAdminAdminSellerSuspensions(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerSuspension.ICreate;
}): Promise<IEcommerceMallSellerSuspension> {
  // Verify seller exists
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.body.sellerId },
    select: { id: true, approval_status: true },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  // Check if seller is already banned - banned sellers cannot be suspended
  if (seller.approval_status === "banned") {
    throw new HttpException("Cannot suspend a banned seller", 400);
  }
  // Check if seller already has an active suspension (restored_at is NULL)
  const existingSuspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirst({
      where: {
        ecommerce_mall_seller_id: props.body.sellerId,
        restored_at: null,
      },
      select: { id: true },
    });
  if (existingSuspension !== null) {
    throw new HttpException("Seller is already suspended", 400);
  }
  // Create suspension record using collector
  const adminEntity: IEntity = { id: props.admin.id };
  const suspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create({
      data: await EcommerceMallSellerSuspensionCollector.collect({
        body: props.body,
        ecommerceMallAdmins: adminEntity,
      }),
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  // Log admin action in audit log
  const auditLogId: string & tags.Format<"uuid"> = generateUuid();
  await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.create({
    data: {
      id: auditLogId,
      ecommerce_mall_admin_id: props.admin.id,
      action: "suspend_seller",
      resource_type: "seller_suspension",
      resource_id: suspension.id,
      details: JSON.stringify({
        seller_id: props.body.sellerId,
        reason: props.body.reason,
      }),
      ip_address: "",
      user_agent: null,
      created_at: new Date(),
    },
  });
  // Transform and return response
  return await EcommerceMallSellerSuspensionTransformer.transform(suspension);
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
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminSellerSuspensions(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSellerSuspension.ICreate;
// }): Promise<IEcommerceMallSellerSuspension> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.create({
//     data: await EcommerceMallSellerSuspensionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallSellerSuspensionTransformer.select(),
//   });
//   return await EcommerceMallSellerSuspensionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------