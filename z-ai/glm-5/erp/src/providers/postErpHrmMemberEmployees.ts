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
import { ErpHrmEmployeeCollector } from "../collectors/ErpHrmEmployeeCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeTransformer } from "../transformers/ErpHrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmEmployee.ICreate;
}): Promise<IErpHrmEmployee> {
  // Get session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Look up member by email
  const targetMember = await MyGlobal.prisma.erp_hrm_members.findUnique({
    where: { email: props.body.email },
  });
  if (!targetMember) {
    throw new HttpException("Member not found with this email", 404);
  }
  // Check for duplicate employee record
  const existingEmployee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: targetMember.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
  });
  if (existingEmployee) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  // Validate role belongs to organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.body.roleId },
  });
  if (!role || role.organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Invalid role for this organization", 400);
  }
  // Validate department if provided
  if (props.body.departmentId) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: { id: props.body.departmentId },
    });
    if (
      !department ||
      department.organization_id !== session.erp_hrm_organization_id
    ) {
      throw new HttpException("Invalid department for this organization", 400);
    }
  }
  // Use collector to create employee data
  const employeeData = await ErpHrmEmployeeCollector.collect({
    body: props.body,
    organization: { id: session.erp_hrm_organization_id },
  });
  // Create employee record
  const created = await MyGlobal.prisma.erp_hrm_employees.create({
    data: employeeData,
    ...ErpHrmEmployeeTransformer.select(),
  });
  // Transform and return
  return await ErpHrmEmployeeTransformer.transform(created);
}
