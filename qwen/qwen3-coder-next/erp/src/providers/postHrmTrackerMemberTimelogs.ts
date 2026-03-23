import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerTimelogCollector } from "../collectors/HrmTrackerTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTimelogTransformer } from "../transformers/HrmTrackerTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postHrmTrackerMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTrackerTimelog.ICreate;
}): Promise<IHrmTrackerTimelog> {
  // 1. Verify employee exists and belongs to member's organization
  const employee =
    await MyGlobal.prisma.hrm_tracker_employees.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true, organization_id: true },
    });
  // 2. Verify project exists and belongs to same organization
  const project = await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
    select: { id: true, hrm_tracker_organization_id: true },
  });
  if (project.hrm_tracker_organization_id !== employee.organization_id) {
    throw new HttpException("Project not found", 404);
  }
  // 3. Verify employee is assigned to project (via ProjectMember)
  const projectMember =
    await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
      where: {
        employee: { id: employee.id },
        project: { id: props.body.project_id },
        deleted_at: null,
      },
    });
  if (!projectMember) {
    throw new HttpException("Forbidden: employee not assigned to project", 403);
  }
  // 4. Optional: Verify task belongs to selected project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_tracker_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { id: true, project_id: true },
    });
    if (!task) {
      throw new HttpException("Task not found", 404);
    }
    if (task.project_id !== props.body.project_id) {
      throw new HttpException("Task does not belong to project", 400);
    }
  }
  // 5. Create timelog using collector
  const created = await MyGlobal.prisma.hrm_tracker_timelogs.create({
    data: await HrmTrackerTimelogCollector.collect({
      body: props.body,
      hrmTrackerEmployees: { id: employee.id },
      hrmTrackerOrganizations: { id: employee.organization_id },
    }),
    ...HrmTrackerTimelogTransformer.select(),
  });
  // 6. Transform to response DTO
  return await HrmTrackerTimelogTransformer.transform(created);
}
