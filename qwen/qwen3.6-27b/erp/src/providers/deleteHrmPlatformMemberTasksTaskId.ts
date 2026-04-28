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

export async function deleteHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve task with project scope and assigned employee FK
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_project_id: true,
      hrm_platform_employee_id: true,
      title: true,
      project: {
        select: {
          hrm_platform_organization_id: true,
        },
      },
    },
  });
  const organizationId = task.project.hrm_platform_organization_id;
  // 2. Verify organization scope and ownership via employee + role
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        hrm_platform_organization_id_hrm_platform_member_id: {
          hrm_platform_organization_id: organizationId,
          hrm_platform_member_id: props.member.id,
        },
      },
      select: {
        id: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  const isOwnerOrManager =
    employee.role.name === "Owner" || employee.role.name === "Manager";
  const isAssignedEmployee = task.hrm_platform_employee_id === employee.id;
  if (!isOwnerOrManager && !isAssignedEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Timelog constraint check — preserve time tracking history
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_task_id: props.taskId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException("Cannot delete task with associated timelogs", 409);
  }
  // 4. Subtask protection check — prevent cascade soft-delete
  const subtaskCount = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: {
      parent_id: props.taskId,
      deleted_at: null,
    },
  });
  if (subtaskCount > 0) {
    throw new HttpException("Cannot delete task that has subtasks", 409);
  }
  // 5. Active timer check — prevent deleting task with running timer
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_tasks_id: props.taskId,
      stopped_at: null,
      deleted_at: null,
    },
  });
  if (activeTimer !== null) {
    throw new HttpException("Cannot delete task with an active timer", 409);
  }
  // 6. Soft delete the task
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: {
      id: props.taskId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Record activity log for audit trail
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: organizationId,
      hrm_platform_member_id: props.member.id,
      action_type: "task_deleted",
      entity_type: "task",
      entity_id: props.taskId,
      entity_name: task.title,
      created_at: new Date(),
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmPlatformMemberTasksTaskId(props: {
//   member: MemberPayload;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------