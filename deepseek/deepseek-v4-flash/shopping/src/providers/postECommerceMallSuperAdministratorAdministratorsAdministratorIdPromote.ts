import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSuperAdministratorTransformer } from "../transformers/ECommerceMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSuperAdministratorAdministratorsAdministratorIdPromote(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallSuperAdministrator> {
  // Look up the target administrator, excluding soft-deleted accounts
  const administrator =
    await MyGlobal.prisma.e_commerce_mall_administrators.findFirstOrThrow({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        password_hash: true,
      },
    });
  // Verify the target administrator is not already a super administrator
  // by checking if a super_administrators record exists with this FK
  const existingSuperAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUnique({
      where: {
        e_commerce_mall_administrator_id: administrator.id,
      },
      select: {
        id: true,
      },
    });
  if (existingSuperAdmin !== null) {
    throw new HttpException(
      "The target administrator is already a super administrator",
      409,
    );
  }
  // Generate IDs and timestamps for the new records
  const superAdminId: string & tags.Format<"uuid"> = v4();
  const gradeChangeLogId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  // Create super administrator record and grade change log atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.e_commerce_mall_super_administrators.create({
      data: {
        id: superAdminId,
        e_commerce_mall_administrator_id: administrator.id,
        email: administrator.email,
        password_hash: administrator.password_hash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.e_commerce_mall_admin_grade_change_logs.create({
      data: {
        id: gradeChangeLogId,
        administrator_id: administrator.id,
        super_administrator_id: props.superAdministrator.id,
        previous_grade: "regular",
        new_grade: "super",
        created_at: now,
      },
    }),
  ]);
  // Query and return the created super administrator via transformer
  const record =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUniqueOrThrow(
      {
        where: { id: superAdminId },
        ...ECommerceMallSuperAdministratorTransformer.select(),
      },
    );
  return await ECommerceMallSuperAdministratorTransformer.transform(record);
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
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSuperAdministratorAdministratorsAdministratorIdPromote(props: {
//   superAdministrator: SuperadministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallSuperAdministrator> {
//   const record = await MyGlobal.prisma.e_commerce_mall_super_administrators.findFirstOrThrow({
//     ...ECommerceMallSuperAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSuperAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------