import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeTransformer } from "../transformers/HrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberProfile(props: {
  member: MemberPayload;
  body: IHrmEmployee.IUpdate;
}): Promise<IHrmEmployee> {
  await MyGlobal.prisma.hrm_members.update({
    where: { id: props.member.id },
    data: {
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...HrmEmployeeTransformer.select(),
  });
  return await HrmEmployeeTransformer.transform(updated);
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
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberProfile(props: {
//   member: MemberPayload;
//   body: IHrmEmployee.IUpdate;
// }): Promise<IHrmEmployee> {
//   await MyGlobal.prisma.hrm_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
//     where: { ... },
//     ...HrmEmployeeTransformer.select(),
//   });
//   return await HrmEmployeeTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------