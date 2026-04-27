import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimerTransformer } from "../transformers/HrmTimeTrackingTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimer.IUpdate;
}): Promise<IHrmTimeTrackingTimer> {
  // 1. Fetch the timer with key fields
  const timer =
    await MyGlobal.prisma.hrm_time_tracking_timers.findUniqueOrThrow({
      where: { id: props.timerId },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_project_id: true,
        status: true,
      },
    });
  // 2. Verify timer is running — stopped/discarded timers are final
  if (timer.status !== "running") {
    throw new HttpException("Timer is not running", 422);
  }
  // 3. Fetch the employee linked to this timer
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: timer.hrm_time_tracking_employee_id },
      select: {
        id: true,
        hrm_time_tracking_member_id: true,
        hrm_time_tracking_organization_id: true,
        status: true,
      },
    });
  // 4. Verify timer ownership — only the timer owner can update
  if (employee.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Verify employee is active (per Employee Status Rules)
  if (employee.status !== "active") {
    throw new HttpException("Deactivated employees cannot update timers", 422);
  }
  // Determine the effective project ID (new or existing)
  const effectiveProjectId =
    props.body.projectId !== undefined
      ? props.body.projectId
      : timer.hrm_time_tracking_project_id;
  // 6. Validate project if explicitly provided
  if (props.body.projectId !== undefined) {
    const project =
      await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
        where: { id: props.body.projectId },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          status: true,
        },
      });
    // 6a. Project must belong to the same organization as the employee
    if (
      project.hrm_time_tracking_organization_id !==
      employee.hrm_time_tracking_organization_id
    ) {
      throw new HttpException(
        "Project does not belong to the same organization",
        422,
      );
    }
    // 6b. Project must be active (per Timer on Archived/Completed Project)
    if (project.status !== "active") {
      throw new HttpException(
        "Archived or completed projects are not accepting new time entries",
        422,
      );
    }
    // 6c. Employee must be an active project member
    const projectMember =
      await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
        where: {
          hrm_time_tracking_project_id: props.body.projectId,
          hrm_time_tracking_employee_id: employee.id,
          deleted_at: null,
        },
      });
    if (projectMember === null) {
      throw new HttpException(
        "Employee is not assigned to the selected project",
        422,
      );
    }
  }
  // 7. Validate task if provided (undefined = skip, null = clear, UUID = set)
  if (props.body.taskId !== undefined) {
    if (props.body.taskId !== null) {
      const task =
        await MyGlobal.prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
          where: { id: props.body.taskId },
          select: {
            id: true,
            hrm_time_tracking_project_id: true,
            deleted_at: true,
          },
        });
      // Task must belong to the effective project
      if (task.hrm_time_tracking_project_id !== effectiveProjectId) {
        throw new HttpException(
          "Task does not belong to the selected project",
          422,
        );
      }
      // Task must not be soft-deleted
      if (task.deleted_at !== null) {
        throw new HttpException("Task is soft-deleted", 422);
      }
    }
  }
  // 8. Apply the update with only the explicitly provided fields
  await MyGlobal.prisma.hrm_time_tracking_timers.update({
    where: { id: props.timerId },
    data: {
      updated_at: new Date().toISOString(),
      ...(props.body.projectId !== undefined && {
        hrm_time_tracking_project_id: props.body.projectId,
      }),
      ...(props.body.taskId !== undefined && {
        hrm_time_tracking_task_id: props.body.taskId,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
    },
  });
  // 9. Return the full updated timer using the transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timers.findUniqueOrThrow({
      where: { id: props.timerId },
      ...HrmTimeTrackingTimerTransformer.select(),
    });
  return await HrmTimeTrackingTimerTransformer.transform(updated);
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
// import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingMemberTimersTimerId(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTimer.IUpdate;
// }): Promise<IHrmTimeTrackingTimer> {
//   await MyGlobal.prisma.hrm_time_tracking_timers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_timers.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingTimerTransformer.select(),
//   });
//   return await HrmTimeTrackingTimerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------