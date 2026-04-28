import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractTransformer } from "../transformers/HrmPlatformEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.IUpdate;
}): Promise<IHrmPlatformEmployeeContract> {
  const existing =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        end_date: true,
      },
    });
  if (existing.hrm_platform_employee_id !== props.employeeId) {
    throw new HttpException("Contract does not belong to this employee", 403);
  }
  if (existing.end_date !== null && existing.end_date.getTime() < Date.now()) {
    throw new HttpException("Cannot modify a past contract", 400);
  }
  await MyGlobal.prisma.hrm_platform_employee_contracts.update({
    where: { id: props.contractId },
    data: {
      ...(props.body.payRate !== undefined && { pay_rate: props.body.payRate }),
      ...(props.body.payPeriod !== undefined && {
        pay_period: props.body.payPeriod,
      }),
      ...(props.body.workingHoursPerWeek !== undefined && {
        working_hours_per_week: props.body.workingHoursPerWeek,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      ...HrmPlatformEmployeeContractTransformer.select(),
    });
  return await HrmPlatformEmployeeContractTransformer.transform(updated);
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
// import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberEmployeesEmployeeIdContractsContractId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmPlatformEmployeeContract.IUpdate;
// }): Promise<IHrmPlatformEmployeeContract> {
//   await MyGlobal.prisma.hrm_platform_employee_contracts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformEmployeeContractTransformer.select(),
//   });
//   return await HrmPlatformEmployeeContractTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------