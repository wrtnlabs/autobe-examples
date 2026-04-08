import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      hrm_platform_project_id: true,
      parent_task_id: true,
    },
  });
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        employee: {
          member_id: props.member.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        role: true,
        employee: {
          select: {
            id: true,
            role_id: true,
          },
        },
      },
    });
  if (!projectMembership) {
    throw new HttpException("Not a project member", 403);
  }
  const isProjectLead = projectMembership.role === "project-lead";
  if (!isProjectLead) {
    const employeeRole = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: projectMembership.employee.role_id },
      include: {
        rolePermissions: {
          select: {
            permission: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
    const hasProjectManage = employeeRole?.rolePermissions.some(
      (rp: {
        permission: {
          code: string;
        };
      }) => rp.permission.code === "project:manage",
    );
    if (!hasProjectManage) {
      throw new HttpException(
        "Forbidden: requires project-lead role or project:manage permission",
        403,
      );
    }
  }
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id !== null) {
      const isProjectMember =
        await MyGlobal.prisma.hrm_platform_project_members.findFirst({
          where: {
            hrm_platform_project_id: props.projectId,
            hrm_platform_employee_id: props.body.assigned_employee_id,
          },
        });
      if (!isProjectMember) {
        throw new HttpException(
          "Assigned employee must be a project member",
          400,
        );
      }
    }
  }
  if (props.body.parent_task_id !== undefined) {
    if (props.body.parent_task_id !== null) {
      const parentTask = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
        where: {
          id: props.body.parent_task_id,
          hrm_platform_project_id: props.projectId,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_task_id: true,
        },
      });
      if (!parentTask) {
        throw new HttpException(
          "Parent task must exist in the same project",
          400,
        );
      }
      if (parentTask.parent_task_id !== null) {
        throw new HttpException(
          "Parent task cannot be a subtask itself (one-level nesting only)",
          400,
        );
      }
    }
  }
  if (props.body.status !== undefined && props.body.status !== task.status) {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4(),
        hrm_platform_task_id: props.taskId,
        hrm_platform_member_id: props.member.id,
        old_status: task.status,
        new_status: props.body.status,
        created_at: new Date(),
      },
    });
  }
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      title: props.body.title,
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.estimated_hours !== undefined && {
        estimated_hours: props.body.estimated_hours,
      }),
      ...(props.body.due_date !== undefined && {
        due_date:
          props.body.due_date !== null ? new Date(props.body.due_date) : null,
      }),
      ...(props.body.assigned_employee_id !== undefined && {
        assigned_employee_id: props.body.assigned_employee_id,
      }),
      ...(props.body.parent_task_id !== undefined && {
        parent_task_id: props.body.parent_task_id,
      }),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
    },
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(updated);
}
