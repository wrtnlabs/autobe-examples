import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

export async function patchEcommerceMallSuperAdministratorAdministratorsGradesActionAdministratorId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdministrator.IUpdate;
}): Promise<IEcommerceMallAdministrator> {
  const targetGrade: "regular" | "super" | undefined = props.body.grade;
  if (targetGrade === undefined) {
    throw new HttpException("Grade change is required", 400);
  }
  const existingAdministrator =
    await MyGlobal.prisma.ecommerce_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId, deleted_at: null },
      ...EcommerceMallAdministratorTransformer.select(),
    });
  const isDemotionSelf =
    props.superAdministrator.id === props.administratorId &&
    existingAdministrator.grade === "super" &&
    targetGrade === "regular";
  if (isDemotionSelf) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  const oldGrade: "regular" | "super" = typia.assert<"regular" | "super">(
    existingAdministrator.grade,
  );
  const updatedAdministrator =
    await MyGlobal.prisma.ecommerce_mall_administrators.update({
      where: { id: props.administratorId },
      data: {
        grade: targetGrade,
        updated_at: new Date(),
      },
      ...EcommerceMallAdministratorTransformer.select(),
    });
  const gradeRecord =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades.create({
      data: {
        id: v4(),
        administrator_id: props.administratorId,
        changed_by: props.superAdministrator.id,
        grade: targetGrade,
        previous_grade: oldGrade,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  await MyGlobal.prisma.ecommerce_mall_administrator_grades_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_administrator_grade_id: gradeRecord.id,
      old_grade: oldGrade,
      new_grade: targetGrade,
      created_at: new Date(),
      deleted_at: null,
    },
  });
  return await EcommerceMallAdministratorTransformer.transform(
    updatedAdministrator,
  );
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
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorAdministratorsGradesActionAdministratorId(props: {
//   superAdministrator: SuperadministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdministrator.IUpdate;
// }): Promise<IEcommerceMallAdministrator> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrators.findFirstOrThrow({
//     ...EcommerceMallAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------