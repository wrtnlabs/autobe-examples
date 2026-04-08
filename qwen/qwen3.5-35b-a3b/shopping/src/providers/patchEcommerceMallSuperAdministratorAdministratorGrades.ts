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

export async function patchEcommerceMallSuperAdministratorAdministratorGrades(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallAdministratorGrade.IRequest;
}): Promise<IEcommerceMallAdministrator> {
  const timestampCurrent: Date = new Date();
  const targetAdministrator: IEcommerceMallAdministrator =
    await MyGlobal.prisma.ecommerce_mall_administrators
      .findUniqueOrThrow({
        where: { id: props.body.administrator_id },
        ...EcommerceMallAdministratorTransformer.select(),
      })
      .then((record) =>
        EcommerceMallAdministratorTransformer.transform(record),
      );
  if (targetAdministrator.id === props.superAdministrator.id) {
    throw new HttpException("Cannot perform grade change on self", 400);
  }
  const isGradeValid: boolean =
    props.body.new_grade === "regular" || props.body.new_grade === "super";
  if (!isGradeValid) {
    throw new HttpException("Invalid grade value", 400);
  }
  const updatedAdministratorResult: IEcommerceMallAdministrator =
    await MyGlobal.prisma.ecommerce_mall_administrators
      .update({
        where: { id: props.body.administrator_id },
        data: { grade: props.body.new_grade, updated_at: timestampCurrent },
        ...EcommerceMallAdministratorTransformer.select(),
      })
      .then((record) =>
        EcommerceMallAdministratorTransformer.transform(record),
      );
  const auditRecordId: string = v4();
  await MyGlobal.prisma.ecommerce_mall_administrator_grades.create({
    data: {
      id: auditRecordId,
      administrator_id: props.body.administrator_id,
      changed_by: props.superAdministrator.id,
      grade: props.body.new_grade,
      previous_grade: targetAdministrator.grade,
      reason: props.body.reason ?? null,
      created_at: timestampCurrent,
      updated_at: timestampCurrent,
    },
  });
  const snapshotId: string = v4();
  await MyGlobal.prisma.ecommerce_mall_administrator_grades_snapshots.create({
    data: {
      id: snapshotId,
      administratorGrade: { connect: { id: auditRecordId } },
      old_grade: targetAdministrator.grade,
      new_grade: props.body.new_grade,
      created_at: timestampCurrent,
    },
  });
  return updatedAdministratorResult;
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
// export async function patchEcommerceMallSuperAdministratorAdministratorGrades(props: {
//   superAdministrator: SuperadministratorPayload;
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