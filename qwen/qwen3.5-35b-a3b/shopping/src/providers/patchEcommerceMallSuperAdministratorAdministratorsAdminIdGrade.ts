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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorTransformer } from "../transformers/EcommerceMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorAdministratorsAdminIdGrade(props: {
  superAdministrator: SuperadministratorPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdministratorGrade.IUpdate;
}): Promise<IEcommerceMallAdministrator> {
  if (props.superAdministrator.id === props.adminId) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  if (props.body.grade === undefined) {
    throw new HttpException("Grade is required", 400);
  }
  const gradeValue: "regular" | "super" = props.body.grade;
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrators.findFirstOrThrow({
      where: { id: props.adminId, deleted_at: null },
      ...EcommerceMallAdministratorTransformer.select(),
    });
  if (gradeValue !== "regular" && gradeValue !== "super") {
    throw new HttpException("Invalid grade value", 400);
  }
  if (record.grade === gradeValue) {
    throw new HttpException("Grade is already at the specified value", 400);
  }
  const gradeChangeRecord =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades.create({
      data: {
        id: v4(),
        administrator_id: props.adminId,
        changed_by: props.superAdministrator.id,
        grade: gradeValue,
        previous_grade: record.grade,
        reason: props.body.reason ?? null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  const snapshotRecord =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_administrator_grade_id: gradeChangeRecord.id,
        old_grade: record.grade,
        new_grade: gradeValue,
        created_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  await MyGlobal.prisma.ecommerce_mall_administrators.update({
    where: { id: props.adminId },
    data: {
      grade: gradeValue,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedRecord =
    await MyGlobal.prisma.ecommerce_mall_administrators.findUniqueOrThrow({
      where: { id: props.adminId },
      ...EcommerceMallAdministratorTransformer.select(),
    });
  return await EcommerceMallAdministratorTransformer.transform(updatedRecord);
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
// export async function patchEcommerceMallSuperAdministratorAdministratorsAdminIdGrade(props: {
//   superAdministrator: SuperadministratorPayload;
//   adminId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdministratorGrade.IUpdate;
// }): Promise<IEcommerceMallAdministrator> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrators.findFirstOrThrow({
//     ...EcommerceMallAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------