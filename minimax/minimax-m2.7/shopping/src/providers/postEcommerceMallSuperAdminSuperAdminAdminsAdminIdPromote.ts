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
import { EcommerceMallAdminPromotionCollector } from "../collectors/EcommerceMallAdminPromotionCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionTransformer } from "../transformers/EcommerceMallAdminPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminSuperAdminAdminsAdminIdPromote(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPromotion.ICreate;
}): Promise<IEcommerceMallAdminPromotion> {
  // Step 1: Validate target admin exists and is not soft-deleted
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    select: {
      id: true,
      email: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Step 2: Check if target admin is already a super admin (query by email)
  const existingSuperAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
      where: {
        email: admin.email,
        deleted_at: null,
      },
    });
  if (existingSuperAdmin !== null) {
    throw new HttpException("Admin is already a super administrator", 400);
  }
  // Step 3: Prevent self-promotion
  if (props.adminId === props.superAdmin.id) {
    throw new HttpException(
      "Cannot promote yourself to super administrator",
      400,
    );
  }
  // Step 4: Create promotion audit record
  const promotion =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.create({
      data: await EcommerceMallAdminPromotionCollector.collect({
        body: props.body,
        admin: { id: props.adminId },
        performedBySuperAdmin: { id: props.superAdmin.id },
      }),
    });
  // Step 5: Grant super admin privileges by creating record in super_admins table
  await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id: v4(),
      email: admin.email,
      password_hash: "TEMP_PROMOTED_" + v4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  // Step 6: Fetch promotion record with relations for response
  const promotionRecord =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.findUniqueOrThrow({
      where: { id: promotion.id },
      ...EcommerceMallAdminPromotionTransformer.select(),
    });
  return await EcommerceMallAdminPromotionTransformer.transform(
    promotionRecord,
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
// import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSuperAdminSuperAdminAdminsAdminIdPromote(props: {
//   superAdmin: SuperadminPayload;
//   adminId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdminPromotion.ICreate;
// }): Promise<IEcommerceMallAdminPromotion> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_promotions.create({
//     data: await EcommerceMallAdminPromotionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallAdminPromotionTransformer.select(),
//   });
//   return await EcommerceMallAdminPromotionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------