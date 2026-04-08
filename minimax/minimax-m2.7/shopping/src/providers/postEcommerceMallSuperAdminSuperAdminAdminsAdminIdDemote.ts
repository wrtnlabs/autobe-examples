import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
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
import { EcommerceMallAdminPromotionTransformer } from "../transformers/EcommerceMallAdminPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminSuperAdminAdminsAdminIdDemote(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPromotion.IDemote;
}): Promise<IEcommerceMallAdminPromotion> {
  // Self-demotion prevention: super admin cannot demote themselves
  if (props.adminId === props.superAdmin.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify target admin exists and is not deleted
  await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
    where: { id: props.adminId, deleted_at: null },
  });
  // Verify target admin has super admin privileges by checking promotion records
  const hasSuperAdminPrivilege =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.findFirst({
      where: {
        admin_id: props.adminId,
        action: "promotion",
      },
    });
  if (!hasSuperAdminPrivilege) {
    throw new HttpException("Forbidden", 403);
  }
  // Create demotion audit record
  const created = await MyGlobal.prisma.ecommerce_mall_admin_promotions.create({
    data: {
      id: v4(),
      admin_id: props.adminId,
      performed_by_super_admin_id: props.superAdmin.id,
      action: "demotion",
      reason: props.body.reason ?? null,
      created_at: new Date(),
    },
    ...EcommerceMallAdminPromotionTransformer.select(),
  });
  return await EcommerceMallAdminPromotionTransformer.transform(created);
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
// import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSuperAdminSuperAdminAdminsAdminIdDemote(props: {
//   superAdmin: SuperadminPayload;
//   adminId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdminPromotion.IDemote;
// }): Promise<IEcommerceMallAdminPromotion> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_promotions.findFirstOrThrow({
//     ...EcommerceMallAdminPromotionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminPromotionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------