import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // 1. Validate the project exists and get its organization info
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      name: true,
    },
  });
  // 2. Get the member's employee record with role and permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      role: {
        select: {
          name: true,
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // 3. Verify project belongs to the same organization as the employee
  if (project.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException(
      "Project does not belong to your organization",
      403,
    );
  }
  // 4. Check if requesting user has project:manage permission
  const hasProjectManagePermission = employee.role.rolePermissions.some(
    (rp: { permission: string }) => rp.permission === "project:manage",
  );
  const isOwner = employee.role.name === "Owner";
  const isManager = employee.role.name === "Manager";
  if (!hasProjectManagePermission && !isOwner && !isManager) {
    throw new HttpException(
      "You do not have permission to manage project members",
      403,
    );
  }
  // 5. Get the employee to be assigned from body
  // Note: The ICreate DTO contains project fields rather than employee assignment fields.
  // For this operation to work properly, the DTO should include erpHrmEmployeeId.
  // Currently using the authenticated employee's employee record.
  const targetEmployeeId = employee.id;
  // 6. Validate assigned_role from body or default to 'member'
  const assignedRole =
    (
      props.body as {
        assigned_role?: string;
      }
    ).assigned_role ?? "member";
  if (!["member", "project_lead"].includes(assignedRole)) {
    throw new HttpException(
      "Invalid assigned_role. Must be 'member' or 'project_lead'",
      400,
    );
  }
  // 7. Check for existing membership (unique constraint)
  const existingMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: {
        erp_hrm_employee_id_erp_hrm_project_id: {
          erp_hrm_employee_id: targetEmployeeId,
          erp_hrm_project_id: props.projectId,
        },
      },
    });
  if (existingMembership) {
    throw new HttpException(
      "Employee is already a member of this project",
      409,
    );
  }
  // 8. Create the project membership record
  const now = new Date();
  await MyGlobal.prisma.erp_hrm_project_members.create({
    data: {
      id: v4(),
      erp_hrm_employee_id: targetEmployeeId,
      erp_hrm_project_id: props.projectId,
      assigned_role: assignedRole,
      created_at: now,
      updated_at: now,
    },
  });
  // 9. Fetch the project with full related data using transformer
  const fullProject = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    ...ErpHrmProjectMemberTransformer.select(),
  });
  // 10. Transform and return the response using the transformer
  return await ErpHrmProjectMemberTransformer.transform(fullProject);
}
