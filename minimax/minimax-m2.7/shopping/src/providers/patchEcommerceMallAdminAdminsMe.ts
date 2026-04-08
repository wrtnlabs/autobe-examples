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
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminsMe(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdmin.IUpdate;
}): Promise<IEcommerceMallAdmin> {
  // Update the authenticated admin's profile with the new name
  await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.admin.id },
    data: {
      name: props.body.name,
    },
  });
  // Fetch the updated admin record using transformer for response mapping
  const record = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    ...EcommerceMallAdminTransformer.select(),
  });
  // Transform and return the admin response DTO
  return await EcommerceMallAdminTransformer.transform(record);
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
// export async function patchEcommerceMallAdminAdminsMe(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdmin.IUpdate;
// }): Promise<IEcommerceMallAdmin> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
//     ...EcommerceMallAdminTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------