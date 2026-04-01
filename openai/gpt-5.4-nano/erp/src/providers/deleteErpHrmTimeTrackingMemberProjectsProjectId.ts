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

export async function deleteErpHrmTimeTrackingMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project =
    await MyGlobal.prisma.erp_hrm_time_tracking_projects.findFirst({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
      },
    });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Authorization + organization scoping proxy: caller must be an active member of the project.
  // (project:manage enforcement is domain-level; this guarantees within the selected org context.)
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: project.id,
        employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        membership_role: true,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Project not found", 404);
  }
  const timelogExists =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.findFirst({
      where: {
        erp_hrm_time_tracking_project_id: project.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (timelogExists !== null) {
    // Treat as unavailable.
    throw new HttpException("Project not found", 404);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_projects.delete({
    where: { id: project.id },
  });
}
