import { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
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
import { ECommerceMallAdminGradeChangeLogTransformer } from "../transformers/ECommerceMallAdminGradeChangeLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSuperAdministratorAdministratorsAdministratorIdGradeChangeLogsLogId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallAdminGradeChangeLog> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_admin_grade_change_logs.findFirstOrThrow(
      {
        where: {
          id: props.logId,
          administrator_id: props.administratorId,
        },
        ...ECommerceMallAdminGradeChangeLogTransformer.select(),
      },
    );
  return await ECommerceMallAdminGradeChangeLogTransformer.transform(record);
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
// import { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSuperAdministratorAdministratorsAdministratorIdGradeChangeLogsLogId(props: {
//   superAdministrator: SuperadministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
//   logId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallAdminGradeChangeLog> {
//   const record = await MyGlobal.prisma.e_commerce_mall_admin_grade_change_logs.findFirstOrThrow({
//     ...ECommerceMallAdminGradeChangeLogTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallAdminGradeChangeLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------