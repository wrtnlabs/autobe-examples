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
import { EcommerceMallAdministratorGradeCollector } from "../collectors/EcommerceMallAdministratorGradeCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorGradeTransformer } from "../transformers/EcommerceMallAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdministratorAdministratorGrades(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallAdministratorGrade.ICreate;
}): Promise<IEcommerceMallAdministratorGrade> {
  const { superAdministrator, body } = props;
  // Prevent self-demotion: super admin cannot change their own grade
  if (body.administrator_id === superAdministrator.id) {
    throw new HttpException(
      "Super administrators cannot demote themselves",
      400,
    );
  }
  // Query target administrator and validate they exist and are not banned
  const targetAdministrator =
    await MyGlobal.prisma.ecommerce_mall_administrators.findFirst({
      where: {
        id: body.administrator_id,
      },
      select: {
        id: true,
        is_banned: true,
      },
    });
  if (targetAdministrator === null) {
    throw new HttpException("Target administrator does not exist", 400);
  }
  if (targetAdministrator.is_banned === true) {
    throw new HttpException("Target administrator is banned", 403);
  }
  // Query current grade of target administrator
  const currentGradeRecord =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades.findFirst({
      where: {
        administrator_id: body.administrator_id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 1,
    });
  // Validate grade change is valid (can't change to same grade)
  if (currentGradeRecord !== null && currentGradeRecord.grade === body.grade) {
    throw new HttpException(
      "Administrator is already at this grade level",
      400,
    );
  }
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades.create({
      data: await EcommerceMallAdministratorGradeCollector.collect({
        body: body,
        changedBy: {
          id: superAdministrator.id,
        },
      }),
      ...EcommerceMallAdministratorGradeTransformer.select(),
    });
  return await EcommerceMallAdministratorGradeTransformer.transform(record);
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
// export async function postEcommerceMallSuperAdministratorAdministratorGrades(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallAdministratorGrade.ICreate;
// }): Promise<IEcommerceMallAdministratorGrade> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrator_grades.create({
//     data: await EcommerceMallAdministratorGradeCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallAdministratorGradeTransformer.select(),
//   });
//   return await EcommerceMallAdministratorGradeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------