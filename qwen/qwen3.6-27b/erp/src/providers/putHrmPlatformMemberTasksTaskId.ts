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

export async function putHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IUpdate;
}): Promise<IHrmPlatformTask> {
  const existingTask =
    await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.taskId, deleted_at: null },
      select: {
        id: true,
        status: true,
        hrm_platform_project_id: true,
      },
    });
  if (props.body.status !== undefined) {
    const current = existingTask.status;
    const next = props.body.status;
    const allowedTransitions: Record<string, string[]> = {
      open: ["in-progress"],
      "in-progress": ["completed"],
      completed: ["closed"],
      closed: [],
    };
    if (!allowedTransitions[current]?.includes(next)) {
      throw new HttpException("Invalid status transition", 400);
    }
  }
  if (props.body.hrmPlatformEmployeeId !== undefined) {
    const targetEmployeeId = props.body.hrmPlatformEmployeeId;
    if (targetEmployeeId !== null) {
      const membership =
        await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
          where: {
            hrm_platform_employee_id: targetEmployeeId,
            hrm_platform_project_id: existingTask.hrm_platform_project_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (membership === null) {
        throw new HttpException(
          "Assigned employee must be a member of the task's project",
          400,
        );
      }
    }
  }
  if (props.body.parentId !== undefined) {
    const targetParentId = props.body.parentId;
    if (targetParentId !== null) {
      if (targetParentId === props.taskId) {
        throw new HttpException("A task cannot be its own parent", 400);
      }
      const parentTask =
        await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
          where: { id: targetParentId, deleted_at: null },
          select: {
            id: true,
            hrm_platform_project_id: true,
            parent_id: true,
          },
        });
      if (
        parentTask.hrm_platform_project_id !==
        existingTask.hrm_platform_project_id
      ) {
        throw new HttpException(
          "Parent task must belong to the same project",
          400,
        );
      }
      if (parentTask.parent_id !== null) {
        throw new HttpException(
          "Parent task cannot already have a parent task",
          400,
        );
      }
    }
  }
  const updateData = {
    updated_at: new Date(),
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.estimatedHours !== undefined && {
      estimated_hours: props.body.estimatedHours,
    }),
    ...(props.body.dueAt !== undefined && {
      due_at: props.body.dueAt !== null ? new Date(props.body.dueAt) : null,
    }),
    ...(props.body.hrmPlatformEmployeeId !== undefined && {
      assignedEmployee:
        props.body.hrmPlatformEmployeeId === null
          ? { disconnect: true }
          : { connect: { id: props.body.hrmPlatformEmployeeId } },
    }),
    ...(props.body.parentId !== undefined && {
      parentTask:
        props.body.parentId === null
          ? { disconnect: true }
          : { connect: { id: props.body.parentId } },
    }),
  } satisfies Prisma.hrm_platform_tasksUpdateInput;
  if (
    props.body.status !== undefined &&
    props.body.status !== existingTask.status
  ) {
    await MyGlobal.prisma.hrm_platform_task_histories.create({
      data: {
        id: v4(),
        hrm_platform_task_id: props.taskId,
        hrm_platform_member_id: props.member.id,
        old_status: existingTask.status,
        new_status: props.body.status,
        created_at: new Date(),
      },
    });
  }
  if (Object.keys(updateData).length === 1) {
    throw new HttpException(
      "At least one field must be provided for update",
      400,
    );
  }
  await MyGlobal.prisma.hrm_platform_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(updated);
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
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
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