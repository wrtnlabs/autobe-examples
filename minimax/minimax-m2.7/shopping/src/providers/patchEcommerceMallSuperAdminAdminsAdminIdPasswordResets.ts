import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPasswordResetTransformer } from "../transformers/EcommerceMallAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminsAdminIdPasswordResets(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPasswordReset.IRequest;
}): Promise<IPageIEcommerceMallAdminPasswordReset> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findMany({
      ...EcommerceMallAdminPasswordResetTransformer.select(),
      where: {
        ecommerce_mall_admin_id: props.adminId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_password_resets.count({
      where: {
        ecommerce_mall_admin_id: props.adminId,
      },
    });
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: await ArrayUtil.asyncMap(
        records,
        EcommerceMallAdminPasswordResetTransformer.transform,
      ),
    },
  };
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
// import { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
// import { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminAdminsAdminIdPasswordResets(props: {
//   superAdmin: SuperadminPayload;
//   adminId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdminPasswordReset.IRequest;
// }): Promise<IPageIEcommerceMallAdminPasswordReset> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findMany({
//     ...EcommerceMallAdminPasswordResetTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminPasswordResetTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------