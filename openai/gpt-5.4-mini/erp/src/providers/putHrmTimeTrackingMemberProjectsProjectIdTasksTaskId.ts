import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IUpdate;
}): Promise<IHrmTimeTrackingTask> {
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      organization_id: project.organization_id,
      user_account_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (employee === null) throw new HttpException("Forbidden", 403);
  const membership =
    await MyGlobal.prisma.hrm_time_tracking_project_memberships.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        is_project_lead: true,
      },
    });
  if (membership === null) throw new HttpException("Forbidden", 403);
  if (membership.is_project_lead !== true)
    throw new HttpException("Forbidden", 403);
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.taskId,
        hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_project_id: true,
        hrm_time_tracking_employee_id: true,
        parent_id: true,
        status: true,
      },
    });
  if (
    props.body.hrm_time_tracking_employee_id !== undefined &&
    props.body.hrm_time_tracking_employee_id !== null
  ) {
    const assignee =
      await MyGlobal.prisma.hrm_time_tracking_project_memberships.findFirst({
        where: {
          hrm_time_tracking_project_id: props.projectId,
          hrm_time_tracking_employee_id:
            props.body.hrm_time_tracking_employee_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (assignee === null)
      throw new HttpException("Project assignee must be a project member", 409);
  }
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    if (props.body.parent_id === props.taskId) {
      throw new HttpException("Task cannot be its own parent", 409);
    }
    const parent = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
      where: {
        id: props.body.parent_id,
        hrm_time_tracking_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    if (parent === null)
      throw new HttpException(
        "Parent task must belong to the same project",
        404,
      );
    if (parent.parent_id !== null)
      throw new HttpException("Task nesting cannot exceed one level", 409);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_tasks.update({
      where: {
        id: props.taskId,
      },
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
            props.body.due_date === null ? null : new Date(props.body.due_date),
        }),
        ...(props.body.hrm_time_tracking_employee_id !== undefined && {
          hrm_time_tracking_employee_id:
            props.body.hrm_time_tracking_employee_id,
        }),
        ...(props.body.parent_id !== undefined && {
          parent_id: props.body.parent_id,
        }),
        updated_at: new Date(),
      },
    });
    if (
      props.body.status !== undefined &&
      props.body.status !== existing.status
    ) {
      await tx.hrm_time_tracking_task_histories.create({
        data: {
          id: v4(),
          hrm_time_tracking_task_id: props.taskId,
          hrm_time_tracking_member_id: props.member.id,
          from_status: existing.status,
          to_status: props.body.status,
          changed_at: new Date(),
        },
      });
    }
    return await tx.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: {
        id: props.taskId,
      },
      ...HrmTimeTrackingTaskTransformer.select(),
    });
  });
  return await HrmTimeTrackingTaskTransformer.transform(updated);
}
