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

export async function putErpHrmMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmEmployee.IUpdate;
}): Promise<IErpHrmEmployee> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId, deleted_at: null },
    select: { id: true, erp_hrm_organization_id: true },
  });
  if (employee.erp_hrm_organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Employee not found", 404);
  }
  if (props.body.role_id !== undefined) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
      where: { id: props.body.role_id },
      select: { erp_hrm_organization_id: true },
    });
    if (role.erp_hrm_organization_id !== session.erp_hrm_organization_id) {
      throw new HttpException("Role not found", 422);
    }
  }
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department =
      await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
        where: { id: props.body.department_id },
        select: { erp_hrm_organization_id: true },
      });
    if (
      department.erp_hrm_organization_id !== session.erp_hrm_organization_id
    ) {
      throw new HttpException("Department not found", 422);
    }
  }
  if (
    props.body.employment_type !== undefined &&
    !["full-time", "part-time", "contractor", "intern"].includes(
      props.body.employment_type,
    )
  ) {
    throw new HttpException(
      "Invalid employment type. Must be one of: full-time, part-time, contractor, intern",
      422,
    );
  }
  if (
    props.body.status !== undefined &&
    !["active", "deactivated"].includes(props.body.status)
  ) {
    throw new HttpException(
      "Invalid status. Must be one of: active, deactivated",
      422,
    );
  }
  const hasUpdates =
    props.body.role_id !== undefined ||
    props.body.department_id !== undefined ||
    props.body.position !== undefined ||
    props.body.employment_type !== undefined ||
    props.body.status !== undefined;
  if (!hasUpdates) {
    const current = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...ErpHrmEmployeeTransformer.select(),
    });
    return await ErpHrmEmployeeTransformer.transform(current);
  }
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data: {
      ...(props.body.role_id !== undefined
        ? { erp_hrm_role_id: props.body.role_id }
        : {}),
      ...(props.body.department_id !== undefined
        ? { erp_hrm_department_id: props.body.department_id }
        : {}),
      ...(props.body.position !== undefined
        ? { position: props.body.position }
        : {}),
      ...(props.body.employment_type !== undefined
        ? { employment_type: props.body.employment_type }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      updated_at: new Date(),
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
// export async function putErpHrmMemberEmployeesEmployeeId(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmEmployee.IUpdate;
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