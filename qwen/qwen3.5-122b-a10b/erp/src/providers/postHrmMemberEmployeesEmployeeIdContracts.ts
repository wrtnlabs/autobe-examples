import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmContractCollector } from "../collectors/HrmContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmContractTransformer } from "../transformers/HrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmContract.ICreate;
}): Promise<IHrmContract> {
  // 1. Validate employee exists and is not deleted
  const employee = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
      deleted_at: true,
    },
  });
  if (employee === null || employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Check member has employee:manage permission for the organization
  const role = await MyGlobal.prisma.hrm_roles.findUnique({
    where: { id: employee.role_id },
    select: {
      id: true,
      hrm_organization_id: true,
    },
  });
  if (role === null || role.hrm_organization_id !== employee.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the employee:manage permission
  const permission = await MyGlobal.prisma.hrm_permissions.findFirst({
    where: {
      permission_name: "employee:manage",
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if role has the permission
  const hasManagePermission =
    await MyGlobal.prisma.hrm_role_permissions.findFirst({
      where: {
        hrm_role_id: role.id,
        hrm_permission_id: permission.id,
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate pay_period is one of the allowed values
  const validPayPeriods: string[] = ["hourly", "daily", "weekly", "monthly"];
  if (!validPayPeriods.includes(props.body.pay_period)) {
    throw new HttpException(
      "Invalid pay_period value. Must be one of: hourly, daily, weekly, monthly",
      400,
    );
  }
  // 4. Query for existing active contract
  const existingActiveContract = await MyGlobal.prisma.hrm_contracts.findFirst({
    where: {
      hrm_employee_id: props.employeeId,
      end_date: null,
      deleted_at: null,
    },
  });
  // 5. If active contract exists, terminate it
  if (existingActiveContract !== null) {
    // Calculate end date: one day before new start_date
    const startDate = new Date(props.body.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() - 1);
    const endDateString = toISOStringSafe(endDate);
    await MyGlobal.prisma.hrm_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: endDateString,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // 6. Create new contract using collector
  const created = await MyGlobal.prisma.hrm_contracts.create({
    data: await HrmContractCollector.collect({
      body: props.body,
      employee: { id: props.employeeId },
    }),
    ...HrmContractTransformer.select(),
  });
  // 7. Return transformed contract
  return await HrmContractTransformer.transform(created);
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
// import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberEmployeesEmployeeIdContracts(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmContract.ICreate;
// }): Promise<IHrmContract> {
//   const record = await MyGlobal.prisma.hrm_contracts.create({
//     data: await HrmContractCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmContractTransformer.select(),
//   });
//   return await HrmContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------