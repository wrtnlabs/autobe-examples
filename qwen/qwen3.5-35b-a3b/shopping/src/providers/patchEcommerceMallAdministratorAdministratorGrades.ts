import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallAdministratorTransformer } from "../transformers/EcommerceMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallAdministratorGrade.IRequest;
}): Promise<IEcommerceMallAdministrator> {
  const requestingAdminId = props.administrator.id;
  const targetAdminId = props.body.administrator_id;
  const newGrade = props.body.new_grade;
  const reason = props.body.reason;
  // Validate requesting administrator is super and not banned
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_mall_administrators.findUniqueOrThrow({
      where: { id: requestingAdminId },
      select: { grade: true, is_banned: true },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  if (requestingAdmin.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate target administrator exists
  const targetAdmin =
    await MyGlobal.prisma.ecommerce_mall_administrators.findUniqueOrThrow({
      where: { id: targetAdminId },
      select: {
        id: true,
        email: true,
        display_name: true,
        grade: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Prevent self-demotion
  if (targetAdmin.id === requestingAdminId) {
    throw new HttpException("Cannot change own grade", 400);
  }
  // Validate new grade
  if (newGrade !== "regular" && newGrade !== "super") {
    throw new HttpException("Invalid grade value", 400);
  }
  const previousGrade = targetAdmin.grade;
  const now = new Date();
  // Update administrator grade
  await MyGlobal.prisma.ecommerce_mall_administrators.update({
    where: { id: targetAdminId },
    data: {
      grade: newGrade,
      updated_at: now,
    },
  });
  // Create grade change audit record
  const gradeRecord =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades.create({
      data: {
        id: v4(),
        administrator_id: targetAdminId,
        changed_by: requestingAdminId,
        grade: newGrade,
        previous_grade: previousGrade,
        reason: reason ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Create snapshot record
  await MyGlobal.prisma.ecommerce_mall_administrator_grades_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_administrator_grade_id: gradeRecord.id,
      old_grade: previousGrade,
      new_grade: newGrade,
      created_at: now,
      deleted_at: null,
    },
  });
  // Return updated administrator using transformer
  const updatedAdmin =
    await MyGlobal.prisma.ecommerce_mall_administrators.findUniqueOrThrow({
      where: { id: targetAdminId },
      ...EcommerceMallAdministratorTransformer.select(),
    });
  return await EcommerceMallAdministratorTransformer.transform(updatedAdmin);
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
// import { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorAdministratorGrades(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallAdministratorGrade.IRequest;
// }): Promise<IEcommerceMallAdministrator> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrators.findFirstOrThrow({
//     ...EcommerceMallAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------