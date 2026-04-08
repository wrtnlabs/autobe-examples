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
import { EcommerceMallAdministratorGradeTransformer } from "../transformers/EcommerceMallAdministratorGradeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorAdministratorGradesGradeChangeId(props: {
  administrator: AdministratorPayload;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdministratorGrade> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_administrator_grades.findUniqueOrThrow(
      {
        ...EcommerceMallAdministratorGradeTransformer.select(),
        where: { id: props.gradeChangeId },
      },
    );
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
// export async function getEcommerceMallAdministratorAdministratorGradesGradeChangeId(props: {
//   administrator: AdministratorPayload;
//   gradeChangeId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdministratorGrade> {
//   const record = await MyGlobal.prisma.ecommerce_mall_administrator_grades.findFirstOrThrow({
//     ...EcommerceMallAdministratorGradeTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdministratorGradeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------