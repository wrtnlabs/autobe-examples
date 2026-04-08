import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTaskTransformer } from "../transformers/HrmTimeTrackTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTask.IUpdate;
}): Promise<IHrmTimeTrackTask> {
  // 1. Find the task with project info for authorization
  const task = await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_track_project_id: true,
      status: true,
    },
  });
  // 2. Get project and check authorization
  const project =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: {
        id: task.hrm_time_track_project_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
        projectMembers: {
          where: {
            deleted_at: null,
          },
          select: {
            role: true,
            employee: {
              select: {
                hrm_time_track_member_id: true,
              },
            },
          },
        },
      },
    });
  // Check if caller is project-lead on this project
  const projectMember = project.projectMembers.find(
    (pm) => pm.employee.hrm_time_track_member_id === props.member.id,
  );
  let hasPermission = false;
  if (projectMember?.role === "project-lead") {
    hasPermission = true;
  } else {
    // Check for project_management permission via employee role
    const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_organization_id: project.hrm_time_track_organization_id,
        deleted_at: null,
      },
      select: {
        hrm_time_track_role_id: true,
      },
    });
    if (employee?.hrm_time_track_role_id) {
      const hasProjectManagePermission =
        await MyGlobal.prisma.hrm_time_track_role_permissions.findFirst({
          where: {
            hrm_time_track_role_id: employee.hrm_time_track_role_id,
            permission: "project_management",
          },
        });
      if (hasProjectManagePermission) {
        hasPermission = true;
      }
    }
  }
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate employee assignment if provided
  if (props.body.hrm_time_track_employee_id !== undefined) {
    if (props.body.hrm_time_track_employee_id !== null) {
      // Verify employee exists and is a member of the same project
      await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
        where: {
          id: props.body.hrm_time_track_employee_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      const employeeProjectMembership =
        await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
          where: {
            hrm_time_track_employee_id: props.body.hrm_time_track_employee_id,
            hrm_time_track_project_id: project.id,
            deleted_at: null,
          },
        });
      if (!employeeProjectMembership) {
        throw new HttpException(
          "Assigned employee must be a member of the project",
          400,
        );
      }
    }
  }
  // 4. Validate parent task if provided
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      // Verify parent task exists, belongs to same project, and has no subtasks
      const parentTask =
        await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow({
          where: {
            id: props.body.parent_task_id,
            deleted_at: null,
          },
          select: {
            hrm_time_track_project_id: true,
            subtasks: {
              where: {
                deleted_at: null,
              },
              select: {
                id: true,
              },
            },
          },
        });
      if (parentTask.hrm_time_track_project_id !== project.id) {
        throw new HttpException(
          "Parent task must belong to the same project",
          400,
        );
      }
      if (parentTask.subtasks.length > 0) {
        throw new HttpException(
          "Parent task already has subtasks. Only one level of nesting is supported.",
          400,
        );
      }
    }
  }
  // 5. Build update data
  const updateData: Prisma.hrm_time_track_tasksUpdateInput = {
    title: props.body.title,
    updated_at: new Date(),
  };
  // Optional fields
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.effort_estimate !== undefined) {
    updateData.effort_estimate = props.body.effort_estimate;
  }
  if (props.body.effort_actual !== undefined) {
    updateData.effort_actual = props.body.effort_actual;
  }
  if (props.body.hrm_time_track_employee_id !== undefined) {
    if (props.body.hrm_time_track_employee_id !== null) {
      updateData.employee = {
        connect: { id: props.body.hrm_time_track_employee_id },
      };
    } else {
      updateData.employee = {
        disconnect: true,
      };
    }
  }
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      updateData.parentTask = {
        connect: { id: props.body.parent_task_id },
      };
    } else {
      updateData.parentTask = {
        disconnect: true,
      };
    }
  }
  // 6. Record task history if status changes
  if (props.body.status !== undefined && props.body.status !== task.status) {
    await MyGlobal.prisma.hrm_time_track_task_histories.create({
      data: {
        id: v4(),
        hrm_time_track_task_id: task.id,
        hrm_time_track_member_id: props.member.id,
        previous_status: task.status,
        new_status: props.body.status,
        created_at: new Date(),
      },
    });
  }
  // 7. Update the task
  await MyGlobal.prisma.hrm_time_track_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  // 8. Return updated task with full relationships
  const fullTask = await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow(
    {
      where: { id: props.taskId },
      ...HrmTimeTrackTaskTransformer.select(),
    },
  );
  return await HrmTimeTrackTaskTransformer.transform(fullTask);
}
