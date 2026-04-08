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

export async function getEcommerceMallSuperAdminAdminsAdminId(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdmin> {
  const record = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
    ...EcommerceMallAdminTransformer.select(),
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
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
// export async function getEcommerceMallSuperAdminAdminsAdminId(props: {
//   superAdmin: SuperadminPayload;
//   adminId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdmin> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
//     ...EcommerceMallAdminTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------