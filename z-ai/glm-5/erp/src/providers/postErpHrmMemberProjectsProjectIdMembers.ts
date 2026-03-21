import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectMemberCollector } from "../collectors/ErpHrmProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // 1. Get session with organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  // 2. Get employee record for current member in this organization
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
  if (!currentEmployee) {
    throw new HttpException("Employee record not found in organization", 403);
  }
  // 3. Check for project:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: currentEmployee.erp_hrm_role_id,
      permission: "project:manage",
    },
  });
  if (!permission) {
    throw new HttpException(
      "Forbidden - project:manage permission required",
      403,
    );
  }
  // 4. Validate project exists and is active
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      organization_id: true,
      status: true,
    },
  });
  if (project.organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Project not found in current organization", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot add members to archived or completed project",
      400,
    );
  }
  // 5. Validate employee exists and is active in same organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.body.employee_id },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      status: true,
    },
  });
  if (employee.erp_hrm_organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Employee not found in current organization", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException(
      "Cannot assign deactivated employee to project",
      400,
    );
  }
  // 6. Check for existing membership (including soft-deleted)
  const existingMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: props.body.employee_id,
        erp_hrm_project_id: props.projectId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (existingMembership) {
    if (existingMembership.deleted_at === null) {
      throw new HttpException("Employee already assigned to this project", 409);
    }
    // Restore soft-deleted membership
    await MyGlobal.prisma.erp_hrm_project_members.update({
      where: { id: existingMembership.id },
      data: {
        role: props.body.role,
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    const restored =
      await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
        where: { id: existingMembership.id },
        ...ErpHrmProjectMemberTransformer.select(),
      });
    return ErpHrmProjectMemberTransformer.transform(restored);
  }
  // 7. Create new membership using collector
  const created = await MyGlobal.prisma.erp_hrm_project_members.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      project: { id: props.projectId },
    }),
    ...ErpHrmProjectMemberTransformer.select(),
  });
  return ErpHrmProjectMemberTransformer.transform(created);
}
