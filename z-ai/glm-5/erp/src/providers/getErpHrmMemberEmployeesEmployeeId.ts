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
import { ErpHrmDepartmentAtSummaryTransformer } from "../transformers/ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "../transformers/ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmEmployee> {
  // Get session to determine organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        id: true,
        erp_hrm_organization_id: true,
      },
    });
  // Validate session has organization context
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get the requested employee with full relations including FK columns for auth
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
      erp_hrm_department_id: true,
      position: true,
      employment_type: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      member: ErpHrmMemberAtSummaryTransformer.select(),
      organization: ErpHrmOrganizationAtSummaryTransformer.select(),
      role: ErpHrmRoleAtSummaryTransformer.select(),
      department: ErpHrmDepartmentAtSummaryTransformer.select(),
    },
  });
  // Check if employee exists and is not deleted
  if (employee === null || employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // Validate organization context - employee must belong to same organization
  if (employee.erp_hrm_organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check authorization: self-access or permission
  const isSelf = employee.erp_hrm_member_id === props.member.id;
  if (!isSelf) {
    // Get current user's employee record in this organization
    const currentEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_role_id: true,
      },
    });
    if (currentEmployee === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if the role has employee:view permission
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: currentEmployee.erp_hrm_role_id,
          permission: "employee:view",
        },
      },
    );
    if (permission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Transform and return
  return {
    id: employee.id,
    member: await ErpHrmMemberAtSummaryTransformer.transform(employee.member),
    organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
      employee.organization,
    ),
    role: await ErpHrmRoleAtSummaryTransformer.transform(employee.role),
    department: employee.department
      ? await ErpHrmDepartmentAtSummaryTransformer.transform(
          employee.department,
        )
      : null,
    position: employee.position,
    employment_type:
      employee.employment_type as IErpHrmEmployee["employment_type"],
    status: employee.status as IErpHrmEmployee["status"],
    created_at: toISOStringSafe(employee.created_at),
    updated_at: toISOStringSafe(employee.updated_at),
    deleted_at: null,
  };
}
