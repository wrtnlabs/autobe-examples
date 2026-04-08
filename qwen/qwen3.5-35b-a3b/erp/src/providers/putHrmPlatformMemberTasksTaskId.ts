import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      project_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      assignedEmployee: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        project: {
          id: task.project_id,
        },
        employee: {
          id: props.member.id satisfies string as string,
        },
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  const isProjectLead = membership.role === "project_lead";
  if (!isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  const validStatusTransitions: Readonly<
    Record<string, ReadonlyArray<string>>
  > = {
    TODO: ["IN_PROGRESS", "TODO"],
    IN_PROGRESS: ["IN_REVIEW", "IN_PROGRESS", "TODO"],
    IN_REVIEW: ["DONE", "IN_REVIEW", "IN_PROGRESS"],
    DONE: ["IN_REVIEW", "DONE"],
  };
  if (props.body.status !== undefined) {
    const allowedNext = validStatusTransitions[task.status];
    if (!allowedNext.includes(props.body.status)) {
      throw new HttpException("Invalid status transition", 400);
    }
  }
  const validPriorities: ReadonlyArray<string> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ];
  if (
    props.body.priority !== undefined &&
    !validPriorities.includes(props.body.priority)
  ) {
    throw new HttpException("Invalid priority value", 400);
  }
  if (
    props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
  ) {
    const employeeMembership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          project: {
            id: task.project_id,
          },
          employee: {
            id: props.body.assigned_employee_id satisfies string as string,
          },
        },
      });
    if (!employeeMembership) {
      throw new HttpException("Assigned employee is not a project member", 400);
    }
  }
  if (
    props.body.estimated_hours !== undefined &&
    props.body.estimated_hours !== null
  ) {
    if (props.body.estimated_hours < 0) {
      throw new HttpException("Estimated hours cannot be negative", 400);
    }
  }
  const updateData: Prisma.hrm_platform_tasksUpdateInput = {};
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id === null) {
      updateData.assignedEmployee = { disconnect: true };
    } else {
      updateData.assignedEmployee = {
        connect: { id: props.body.assigned_employee_id },
      };
    }
  }
  if (props.body.estimated_hours !== undefined) {
    if (props.body.estimated_hours === null) {
      updateData.estimated_hours = null;
    } else {
      updateData.estimated_hours = props.body.estimated_hours;
    }
  }
  if (props.body.due_date !== undefined) {
    if (props.body.due_date === null) {
      updateData.due_date = null;
    } else {
      updateData.due_date = props.body.due_date;
    }
  }
  updateData.updated_at = new Date();
  const updated = await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  const detailsData: Record<string, unknown> = {};
  if (props.body.status !== undefined) {
    detailsData.status = { before: task.status, after: props.body.status };
  }
  if (props.body.priority !== undefined) {
    detailsData.priority = {
      before: task.priority,
      after: props.body.priority,
    };
  }
  if (props.body.title !== undefined) {
    detailsData.title = { before: task.title, after: props.body.title };
  }
  if (props.body.description !== undefined) {
    detailsData.description = {
      before: task.description,
      after: props.body.description,
    };
  }
  if (props.body.assigned_employee_id !== undefined) {
    detailsData.assignedEmployee = {
      before: task.assignedEmployee?.id ?? null,
      after: props.body.assigned_employee_id ?? null,
    };
  }
  if (props.body.estimated_hours !== undefined) {
    detailsData.estimated_hours = {
      before: task.estimated_hours ?? null,
      after: props.body.estimated_hours ?? null,
    };
  }
  if (props.body.due_date !== undefined) {
    detailsData.due_date = {
      before: task.due_date?.toISOString() ?? null,
      after: props.body.due_date ?? null,
    };
  }
  const hasChanges = Object.keys(detailsData).length > 0;
  if (hasChanges) {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4(),
        task_id: props.taskId,
        actor_id: props.member.id,
        action_type: "task_update",
        changed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        details: JSON.stringify(detailsData),
      },
    });
  }
  const fullyUpdated =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmPlatformTaskTransformer.select(),
    });
  return await HrmPlatformTaskTransformer.transform(fullyUpdated);
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
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberTasksTaskId(props: {
//   member: MemberPayload;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTask.IUpdate;
// }): Promise<IHrmPlatformTask> {
//   await MyGlobal.prisma.hrm_platform_tasks.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTaskTransformer.select(),
//   });
//   return await HrmPlatformTaskTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------