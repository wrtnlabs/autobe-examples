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

export async function getHrmMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmEmployee> {
  const employee = await MyGlobal.prisma.hrm_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      user_id: true,
      organization_id: true,
      user: {
        ...HrmEmployeeTransformer.select(),
      } satisfies Prisma.hrm_membersFindManyArgs,
    },
  });
  if (employee.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmEmployeeTransformer.transform(employee.user);
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
// export async function getHrmMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<IHrmEmployee> {
//   const record = await MyGlobal.prisma.hrm_members.findFirstOrThrow({
//     ...HrmEmployeeTransformer.select(),
//     where: { ... },
//   });
//   return await HrmEmployeeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------