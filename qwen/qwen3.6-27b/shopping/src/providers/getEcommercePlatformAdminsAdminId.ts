import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformAdminTransformer } from "../transformers/EcommercePlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformAdmin> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_admins.findUniqueOrThrow({
      where: {
        id: props.adminId,
      },
      ...EcommercePlatformAdminTransformer.select(),
    });
  return await EcommercePlatformAdminTransformer.transform(record);
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
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformAdminsAdminId(props: {
//   adminId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformAdmin> {
//   const record = await MyGlobal.prisma.ecommerce_platform_admins.findFirstOrThrow({
//     ...EcommercePlatformAdminTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------