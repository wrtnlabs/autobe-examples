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

export async function putEcommerceMallAdminAdminProfile(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdmin.IUpdate;
}): Promise<IEcommerceMallAdmin> {
  // Build update data - only include name if provided
  const data = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    updated_at: new Date(),
  };
  // Update the admin profile
  await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.admin.id },
    data,
  });
  // Fetch and return the updated profile
  const updated = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id },
      ...EcommerceMallAdminTransformer.select(),
    },
  );
  return await EcommerceMallAdminTransformer.transform(updated);
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
// export async function putEcommerceMallAdminAdminProfile(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdmin.IUpdate;
// }): Promise<IEcommerceMallAdmin> {
//   await MyGlobal.prisma.ecommerce_mall_admins.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallAdminTransformer.select(),
//   });
//   return await EcommerceMallAdminTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------