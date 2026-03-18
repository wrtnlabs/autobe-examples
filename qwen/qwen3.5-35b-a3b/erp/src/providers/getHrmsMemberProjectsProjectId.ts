import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
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

export async function getHrmsMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmsProject.ISummary> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const project = await MyGlobal.prisma.hrms_projects.findUnique({
    where: {
      id: props.projectId,
      hrms_organization_id: session.current_organization_id ?? "",
      deleted_at: null,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  const organization = await MyGlobal.prisma.hrms_organizations.findFirst({
    where: {
      id: project.hrms_organization_id,
    },
    select: { id: true, name: true },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const result: IHrmsProject.ISummary = {
    id: project.id,
    organization_id: project.hrms_organization_id,
    name: project.name,
    description: project.description ?? "",
    color_code: project.color_code,
    status: project.status as "active" | "archived" | "completed",
    budget_hours: project.budget_hours,
    start_date:
      project.start_date !== null ? toISOStringSafe(project.start_date) : null,
    end_date:
      project.end_date !== null ? toISOStringSafe(project.end_date) : null,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
    organization_name: organization.name,
    planned_hours: project.budget_hours ?? 0,
    actual_hours: 0,
    budget_utilization_percentage: null,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    closed_tasks: 0,
    timelog_count: 0,
  };
  return result;
}
