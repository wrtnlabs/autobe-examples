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
import { EcommerceMallSuperAdminTransformer } from "../transformers/EcommerceMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminsMe(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdmin.IUpdate;
}): Promise<IEcommerceMallSuperAdmin> {
  if (props.body.email !== undefined) {
    const existingEmail =
      await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.superAdmin.id },
          deleted_at: null,
        },
      });
    if (existingEmail !== null) {
      throw new HttpException(
        "Email already in use by another super administrator",
        400,
      );
    }
  }
  await MyGlobal.prisma.ecommerce_mall_super_admins.update({
    where: { id: props.superAdmin.id },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      updated_at: new Date(),
    },
  });
  const record =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUniqueOrThrow({
      where: { id: props.superAdmin.id },
      ...EcommerceMallSuperAdminTransformer.select(),
    });
  return await EcommerceMallSuperAdminTransformer.transform(record);
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
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminsMe(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSuperAdmin.IUpdate;
// }): Promise<IEcommerceMallSuperAdmin> {
//   const record = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirstOrThrow({
//     ...EcommerceMallSuperAdminTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSuperAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------