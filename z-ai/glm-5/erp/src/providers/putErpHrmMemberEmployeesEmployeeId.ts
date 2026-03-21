import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
  // Get member's session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get member's employee record and role for permission check
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      erp_hrm_role_id: true,
    },
  });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for employee:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
      permission: "employee:manage",
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch target employee, verify it belongs to current organization
  const targetEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: { id: true, erp_hrm_organization_id: true },
    });
  if (
    targetEmployee.erp_hrm_organization_id !== session.erp_hrm_organization_id
  ) {
    throw new HttpException("Employee not found in current organization", 404);
  }
  // Validate department if provided (and not null - null means unassign)
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.departmentId,
        organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
      },
    });
    if (department === null) {
      throw new HttpException("Department not found in organization", 400);
    }
  }
  // Build update data object
  const updateData: {
    erp_hrm_department_id?: string | null;
    position?: string | null;
    employment_type?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.departmentId !== undefined) {
    updateData.erp_hrm_department_id = props.body.departmentId;
  }
  if (props.body.position !== undefined) {
    updateData.position = props.body.position;
  }
  if (props.body.employmentType !== undefined) {
    updateData.employment_type = props.body.employmentType;
  }
  // Update employee record
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data: updateData,
  });
  // Create activity log
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: session.erp_hrm_organization_id,
      action_type: "employee_updated",
      entity_type: "employee",
      entity_id: props.employeeId,
      details: JSON.stringify({
        changes: {
          ...(props.body.departmentId !== undefined && {
            departmentId: props.body.departmentId,
          }),
          ...(props.body.position !== undefined && {
            position: props.body.position,
          }),
          ...(props.body.employmentType !== undefined && {
            employmentType: props.body.employmentType,
          }),
        },
      }),
      created_at: new Date(),
    },
  });
  // Fetch and transform updated employee
  const updatedEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...ErpHrmEmployeeTransformer.select(),
    });
  return await ErpHrmEmployeeTransformer.transform(updatedEmployee);
}
