import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminAdminPassword(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdmin.IPasswordUpdate;
}): Promise<IEcommerceMallAdmin.IPasswordChangeSuccess> {
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
    where: { id: props.admin.id },
    select: { id: true, password_hash: true },
  });
  const isValid = await PasswordUtil.verify(
    props.body.currentPassword,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Incorrect current password", 401);
  }
  const hashedPassword = await PasswordUtil.hash(props.body.newPassword);
  await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.admin.id },
    data: {
      password_hash: hashedPassword,
      updated_at: new Date(),
    },
  });
  return {
    message: "Password changed successfully",
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallAdminAdminPassword(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdmin.IPasswordUpdate;
// }): Promise<IEcommerceMallAdmin.IPasswordChangeSuccess> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------