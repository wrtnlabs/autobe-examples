import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminPasswordResetTransformer } from "../transformers/EcommerceMallAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminPasswordResetsResetId(props: {
  admin: AdminPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminPasswordReset> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...EcommerceMallAdminPasswordResetTransformer.select(),
      },
    );
  return await EcommerceMallAdminPasswordResetTransformer.transform(record);
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminPasswordResetsResetId(props: {
//   admin: AdminPayload;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdminPasswordReset> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findFirstOrThrow({
//     ...EcommerceMallAdminPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------