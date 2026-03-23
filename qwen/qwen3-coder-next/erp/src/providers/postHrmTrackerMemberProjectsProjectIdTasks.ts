import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerTaskCollector } from "../collectors/HrmTrackerTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTaskTransformer } from "../transformers/HrmTrackerTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string;
  body: IHrmTrackerTask.ICreate;
}): Promise<IHrmTrackerTask> {
  const project = await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization: true, deleted_at: true },
  });
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const member = await MyGlobal.prisma.hrm_tracker_members.findFirstOrThrow({
    where: { id: props.member.id, deleted_at: null },
    select: { id: true },
  });
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: { user_id: member.id, organization_id: project.organization.id },
    select: { id: true, status: true },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  const projectMembers =
    await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
      where: {
        project: { id: props.projectId },
        employee: { id: employee.id },
      },
      select: { role: true },
    });
  const hasProjectManagePermission = false;
  if (!hasProjectManagePermission && !projectMembers) {
    throw new HttpException("Forbidden", 403);
  }
  if (!hasProjectManagePermission && projectMembers?.role !== "project-lead") {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.assigned_employee_id) {
    const projectMember =
      await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
        where: {
          project: { id: props.projectId },
          employee: { id: props.body.assigned_employee_id },
        },
        select: { id: true },
      });
    if (!projectMember) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  if (props.body.parent_task_id) {
    const parentTask = await MyGlobal.prisma.hrm_tracker_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        project: { id: props.projectId },
      },
      select: { id: true },
    });
    if (!parentTask) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.hrm_tracker_tasks.create({
    data: await HrmTrackerTaskCollector.collect({
      body: props.body,
      hrmTrackerProjects: { id: props.projectId },
    }),
    ...HrmTrackerTaskTransformer.select(),
  });
  return await HrmTrackerTaskTransformer.transform(created);
}
