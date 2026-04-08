import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminAdminDemoteUserId(props: {
  superAdmin: SuperadminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdmin> {
  // Step 1: Find target admin
  const targetAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.userId },
    select: { id: true, email: true, name: true, deleted_at: true },
  });
  if (!targetAdmin) {
    throw new HttpException("Administrator not found", 404);
  }
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Cannot demote a deleted administrator", 400);
  }
  // Step 2: Verify target is currently a super admin
  const superAdminRecord =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUnique({
      where: { id: props.userId },
      select: { id: true },
    });
  if (!superAdminRecord) {
    throw new HttpException("Target user is not a super administrator", 400);
  }
  // Step 3: Prevent self-demotion
  if (props.userId === props.superAdmin.id) {
    throw new HttpException(
      "A user cannot demote their own administrator role",
      400,
    );
  }
  // Step 4: Perform demotion within transaction
  const promotionId: string & tags.Format<"uuid"> = v4();
  const auditLogId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Remove from super_admins table
    await tx.ecommerce_mall_super_admins.delete({
      where: { id: props.userId },
    });
    // Create promotion record (for demotion action)
    await tx.ecommerce_mall_admin_promotions.create({
      data: {
        id: promotionId,
        admin_id: props.userId,
        performed_by_super_admin_id: props.superAdmin.id,
        action: "demotion",
        reason: null,
        created_at: new Date(),
      },
    });
    // Create audit log
    await tx.ecommerce_mall_super_admin_audit_logs.create({
      data: {
        id: auditLogId,
        ecommerce_mall_super_admin_id: props.superAdmin.id,
        action: "demote_to_admin",
        target_type: "admin",
        target_id: props.userId,
        ip: "",
        user_agent: "",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
  // Step 5: Return updated admin using transformer
  const updatedAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      ...EcommerceMallAdminTransformer.select(),
      where: { id: props.userId },
    });
  return await EcommerceMallAdminTransformer.transform(updatedAdmin);
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSuperAdminAdminDemoteUserId(props: {
//   superAdmin: SuperadminPayload;
//   userId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdmin> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
//     ...EcommerceMallAdminTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------