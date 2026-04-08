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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionTransformer } from "../transformers/EcommerceMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminSellerSuspensionsSuspensionIdRestore(props: {
  admin: AdminPayload;
  suspensionId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerSuspension.IRestore;
}): Promise<IEcommerceMallSellerSuspension> {
  const suspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findUnique({
      where: { id: props.suspensionId },
      select: { id: true, restored_at: true },
    });
  if (suspension === null) {
    throw new HttpException("Suspension not found", 404);
  }
  if (suspension.restored_at !== null) {
    throw new HttpException("Suspension has already been restored", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_seller_suspensions.update({
    where: { id: props.suspensionId },
    data: {
      restored_by_id: props.admin.id,
      restored_reason: props.body.restoredReason ?? null,
      restored_at: now,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.suspensionId },
      ...EcommerceMallSellerSuspensionTransformer.select(),
    });
  return await EcommerceMallSellerSuspensionTransformer.transform(updated);
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
// export async function postEcommerceMallAdminAdminSellerSuspensionsSuspensionIdRestore(props: {
//   admin: AdminPayload;
//   suspensionId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSellerSuspension.IRestore;
// }): Promise<IEcommerceMallSellerSuspension> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirstOrThrow({
//     ...EcommerceMallSellerSuspensionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerSuspensionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------