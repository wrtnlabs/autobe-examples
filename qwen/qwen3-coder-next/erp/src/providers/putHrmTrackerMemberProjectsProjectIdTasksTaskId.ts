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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTaskTransformer } from "../transformers/HrmTrackerTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putHrmTrackerMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTrackerTask.IUpdate;
}): Promise<IHrmTrackerTask> {
  const task = await MyGlobal.prisma.hrm_tracker_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: { id: true, project_id: true, assigned_employee_id: true },
  });
  if (task.project_id !== props.projectId) {
    throw new HttpException("Task not found in project", 404);
  }
  const isProjectMember =
    await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
      where: {
        hrm_tracker_project_id: props.projectId,
        employee: {
          user_id: props.member.id,
        },
      },
      select: { id: true },
    });
  if (!isProjectMember) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.assigned_employee_id) {
    const isAssignedEmployeeProjectMember =
      await MyGlobal.prisma.hrm_tracker_project_members.findFirst({
        where: {
          hrm_tracker_project_id: props.projectId,
          hrm_tracker_employee_id: props.body.assigned_employee_id,
        },
        select: { id: true },
      });
    if (!isAssignedEmployeeProjectMember) {
      throw new HttpException("Assigned employee is not a project member", 400);
    }
  }
  const updated = await MyGlobal.prisma.hrm_tracker_tasks.update({
    where: { id: props.taskId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.estimated_hours !== undefined && {
        estimated_hours: props.body.estimated_hours,
      }),
      ...(props.body.due_date !== undefined && {
        due_date:
          props.body.due_date !== null
            ? toISOStringSafe(props.body.due_date)
            : null,
      }),
      ...(props.body.assigned_employee_id !== undefined && {
        assigned_employee_id: props.body.assigned_employee_id,
      }),
      updated_at: new Date().toISOString(),
    },
    ...HrmTrackerTaskTransformer.select(),
  });
  return await HrmTrackerTaskTransformer.transform(updated);
}
