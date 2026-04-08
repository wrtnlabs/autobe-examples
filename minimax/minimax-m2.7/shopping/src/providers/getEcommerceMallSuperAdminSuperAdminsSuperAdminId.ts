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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminSuperAdminsSuperAdminId(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSuperAdmin> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findFirstOrThrow({
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
      where: {
        id: props.superAdminId,
        deleted_at: null,
      },
    });
  return {
    id: record.id,
    email: record.email,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    deletedAt:
      record.deleted_at === null ? null : record.deleted_at.toISOString(),
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
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminSuperAdminsSuperAdminId(props: {
//   superAdmin: SuperadminPayload;
//   superAdminId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSuperAdmin> {
//   const record = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirstOrThrow({
//     ...EcommerceMallSuperAdminTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSuperAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------