import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerOrganizationAtSummaryTransformer } from "../transformers/HrmTrackerOrganizationAtSummaryTransformer";
import { HrmTrackerProjectTransformer } from "../transformers/HrmTrackerProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberProjectsProjectIdStatusChange(props: {
  member: MemberPayload;
  projectId: string;
}): Promise<IHrmTrackerProject> {
  // Fetch project with organization context for authorization and current status
  const project = await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: {
      id: true,
      name: true,
      status: true,
      hrm_tracker_organization_id: true,
      organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
    },
  });
  // Verify actor has project:manage permission via role
  const roleAssignment =
    await MyGlobal.prisma.hrm_tracker_employee_roles.findFirst({
      where: {
        employee: {
          member_id: props.member.id,
          deleted_at: null,
        },
        hrm_tracker_organization_id: project.hrm_tracker_organization_id,
      },
      select: {
        role_id: true,
      },
    });
  if (!roleAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_tracker_roles.findUniqueOrThrow({
    where: { id: roleAssignment.role_id },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });
  if (!role.rolePermissions.some((rp) => rp.permission === "project:manage")) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status transition: active → archived/completed only
  if (project.status !== "active") {
    throw new HttpException(
      "Only active projects can be archived or completed",
      400,
    );
  }
  // Determine new status and update project
  const newStatus = "archived" as const;
  const updated = await MyGlobal.prisma.hrm_tracker_projects.update({
    where: { id: props.projectId },
    data: {
      status: newStatus,
      updated_at: new Date(),
    },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      hrm_tracker_organization_id: true,
      organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
    },
  });
  // Create activity log entry
  await MyGlobal.prisma.hrm_tracker_activity_logs.create({
    data: {
      id: v4(),
      action_type:
        newStatus === "archived" ? "project_archived" : "project_completed",
      action_type: "member",
      actor_id: props.member.id,
      session_id: props.member.session_id,
      target_type: "project",
      target_id: project.id,
      hrm_tracker_organization_id: project.hrm_tracker_organization_id,
      created_at: new Date(),
    },
  });
  return await HrmTrackerProjectTransformer.transform(updated);
}
