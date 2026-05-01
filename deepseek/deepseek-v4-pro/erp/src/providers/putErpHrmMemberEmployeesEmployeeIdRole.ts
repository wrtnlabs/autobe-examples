import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeTransformer } from "../transformers/ErpHrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberEmployeesEmployeeIdRole(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmEmployee.IUpdateRole;
}): Promise<IErpHrmEmployee> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  const callerEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (callerEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.erp_hrm_role_id === props.body.erp_hrm_role_id) {
    const current = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...ErpHrmEmployeeTransformer.select(),
    });
    return await ErpHrmEmployeeTransformer.transform(current);
  }
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.body.erp_hrm_role_id },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      deleted_at: true,
    },
  });
  if (targetRole.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException(
      "Role does not belong to the same organization",
      400,
    );
  }
  if (targetRole.deleted_at !== null) {
    throw new HttpException("Role has been deleted", 400);
  }
  const previousRoleId: string = employee.erp_hrm_role_id;
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data: {
      erp_hrm_role_id: props.body.erp_hrm_role_id,
      updated_at: new Date().toISOString(),
    },
  });
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      user: { connect: { id: props.member.id } },
      organization_id: employee.erp_hrm_organization_id,
      action_type: "role_changed",
      target_entity: "employee",
      target_id: props.employeeId,
      details: JSON.stringify({
        previous_role_id: previousRoleId,
        new_role_id: props.body.erp_hrm_role_id,
      }),
      created_at: new Date().toISOString(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    ...ErpHrmEmployeeTransformer.select(),
  });
  return await ErpHrmEmployeeTransformer.transform(updated);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberEmployeesEmployeeIdRole(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmEmployee.IUpdateRole;
// }): Promise<IErpHrmEmployee> {
//   await MyGlobal.prisma.erp_hrm_employees.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmEmployeeTransformer.select(),
//   });
//   return await ErpHrmEmployeeTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------