import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
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
  // 1. Find task and verify it exists and is not soft-deleted
  const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
    where: { id: props.taskId, deleted_at: null },
    select: {
      id: true,
      hrm_time_tracking_project_id: true,
      status: true,
    },
  });
  if (task === null) {
    throw new HttpException("Task not found", 404);
  }
  // 2. Verify the task belongs to the specified project
  if (task.hrm_time_tracking_project_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      422,
    );
  }
  // 3. Get the project's organization for employee lookup
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { hrm_time_tracking_organization_id: true },
    });
  // 4. Find the employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Verify the employee is a project-lead in this project
  const projectMember =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        hrm_time_tracking_employee_id: employee.id,
        role: "project-lead",
        deleted_at: null,
      },
    });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Validate status transition if provided
  if (props.body.status !== undefined) {
    const VALID_STATUSES = ["open", "in-progress", "completed", "closed"];
    if (VALID_STATUSES.includes(props.body.status) === false) {
      throw new HttpException(
        "Invalid status value. Must be one of: open, in-progress, completed, closed",
        422,
      );
    }
    const STATUS_ORDER: Record<string, number> = {
      open: 0,
      "in-progress": 1,
      completed: 2,
      closed: 3,
    };
    const currentOrder = STATUS_ORDER[task.status];
    const newOrder = STATUS_ORDER[props.body.status];
    if (newOrder !== currentOrder + 1) {
      throw new HttpException(
        "Status must transition sequentially: open \u2192 in-progress \u2192 completed \u2192 closed. Cannot skip statuses or regress.",
        422,
      );
    }
  }
  // 7. Validate employee assignment if provided
  if (
    props.body.hrmTimeTrackingEmployeeId !== undefined &&
    props.body.hrmTimeTrackingEmployeeId !== null
  ) {
    const assignedMember =
      await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
        where: {
          hrm_time_tracking_project_id: props.projectId,
          hrm_time_tracking_employee_id: props.body.hrmTimeTrackingEmployeeId,
          deleted_at: null,
        },
      });
    if (assignedMember === null) {
      throw new HttpException(
        "Assigned employee is not an active member of this project",
        422,
      );
    }
  }
  // 8. Create TaskHistory entry if status is changing
  if (props.body.status !== undefined && props.body.status !== task.status) {
    await MyGlobal.prisma.hrm_time_tracking_task_histories.create({
      data: {
        id: v4(),
        hrm_time_tracking_task_id: props.taskId,
        hrm_time_tracking_employee_id: employee.id,
        previous_status: task.status,
        new_status: props.body.status,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // 9. Update the task with provided fields
  await MyGlobal.prisma.hrm_time_tracking_tasks.update({
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
      ...(props.body.estimatedHours !== undefined && {
        estimated_hours: props.body.estimatedHours,
      }),
      ...(props.body.dueDate !== undefined && {
        due_date:
          props.body.dueDate !== null ? new Date(props.body.dueDate) : null,
      }),
      ...(props.body.hrmTimeTrackingEmployeeId !== undefined && {
        hrm_time_tracking_employee_id: props.body.hrmTimeTrackingEmployeeId,
      }),
      updated_at: new Date(),
    },
  });
  // 10. Return the complete updated task using the transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
      where: { id: props.taskId },
      ...HrmTimeTrackingTaskTransformer.select(),
    });
  return await HrmTimeTrackingTaskTransformer.transform(updated);
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
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberProjectsProjectIdTasksTaskId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTask.IUpdate;
// }): Promise<IHrmTimeTrackingTask> {
//   await MyGlobal.prisma.hrm_time_tracking_tasks.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingTaskTransformer.select(),
//   });
//   return await HrmTimeTrackingTaskTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------