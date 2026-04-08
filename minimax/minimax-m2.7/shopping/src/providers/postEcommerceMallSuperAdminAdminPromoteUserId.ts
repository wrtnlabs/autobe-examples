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

export async function postEcommerceMallSuperAdminAdminPromoteUserId(props: {
  superAdmin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "super_admin";
  };
  userId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPromotion.ICreate;
}): Promise<IEcommerceMallAdminPromotion> {
  const targetAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
      where: {
        id: props.userId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (props.superAdmin.id === props.userId) {
    throw new HttpException("Cannot promote yourself", 403);
  }
  const created = await MyGlobal.prisma.ecommerce_mall_admin_promotions.create({
    data: await EcommerceMallAdminPromotionCollector.collect({
      body: props.body,
      ecommerceMallAdmins: { id: targetAdmin.id },
      ecommerceMallSuperAdmins: { id: props.superAdmin.id },
    }),
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
// export async function postEcommerceMallSuperAdminAdminPromoteUserId(props: {
//   superAdmin: SuperadminPayload;
//   userId: string & tags.Format<"uuid">;
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