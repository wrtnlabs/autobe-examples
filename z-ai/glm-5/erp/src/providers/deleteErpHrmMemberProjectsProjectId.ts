import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get member's current organization context from session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  // Get employee record for this member in the organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: organizationId,
      },
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the member has project:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "project:manage",
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the project and verify it belongs to the organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.projectId,
      organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Check if project has any timelogs
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project with associated timelogs",
      400,
    );
  }
  // Use consistent timestamp for both deletion and activity log
  const now = new Date();
  // Soft delete the project (cascade will handle project_members and tasks)
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Record activity log for audit
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: organizationId,
      action_type: "project_deleted",
      entity_type: "project",
      entity_id: props.projectId,
      details: `Project "${project.name}" was deleted`,
      created_at: now,
    },
  });
}
