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
import { HrmPlatformEmployeeContractCollector } from "../collectors/HrmPlatformEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractTransformer } from "../transformers/HrmPlatformEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.ICreate;
}): Promise<IHrmPlatformEmployeeContract> {
  // Step 1: Verify employee exists
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    });
  // Step 2: Find caller's employee record in the same organization
  const callerEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_role_id: true,
      },
    },
  );
  if (callerEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify caller has employee:manage permission
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: callerEmployee.hrm_platform_role_id,
        permission_key: "employee:manage",
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Transaction - auto-terminate existing active contract and create new
  const newContract = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find existing active contract
    const existingActiveContract =
      await tx.hrm_platform_employee_contracts.findFirst({
        where: {
          hrm_platform_employee_id: props.employeeId,
          deleted_at: null,
          OR: [
            { end_date: null },
            { end_date: { gte: new Date(props.body.start_date) } },
          ],
        },
        select: { id: true },
      });
    // Auto-terminate existing active contract by setting end_date to start_date - 1 day
    if (existingActiveContract !== null) {
      const terminatedEndDate = new Date(props.body.start_date);
      terminatedEndDate.setDate(terminatedEndDate.getDate() - 1);
      await tx.hrm_platform_employee_contracts.update({
        where: { id: existingActiveContract.id },
        data: {
          end_date: terminatedEndDate,
          updated_at: new Date(),
        },
      });
    }
    // Create new contract using collector
    const created = await tx.hrm_platform_employee_contracts.create({
      data: await HrmPlatformEmployeeContractCollector.collect({
        body: props.body,
        hrmPlatformEmployees: employee,
      }),
      ...HrmPlatformEmployeeContractTransformer.select(),
    });
    return created;
  });
  // Step 5: Transform and return
  return await HrmPlatformEmployeeContractTransformer.transform(newContract);
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
// export async function postHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmPlatformEmployeeContract.ICreate;
// }): Promise<IHrmPlatformEmployeeContract> {
//   const record = await MyGlobal.prisma.hrm_platform_employee_contracts.create({
//     data: await HrmPlatformEmployeeContractCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformEmployeeContractTransformer.select(),
//   });
//   return await HrmPlatformEmployeeContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------