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
import { HrmTimeTrackingTimerCollector } from "../collectors/HrmTimeTrackingTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimerTransformer } from "../transformers/HrmTimeTrackingTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postHrmTimeTrackingMemberTimers(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimer.ICreate;
}): Promise<IHrmTimeTrackingTimer> {
  // 1. Look up the project to get organization context and validate status
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.body.projectId },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        status: true,
      },
    });
  // Project must be 'active' — archived or completed projects reject new timers
  if (project.status === "archived" || project.status === "completed") {
    throw new HttpException(
      "The selected project is not accepting new time entries",
      400,
    );
  }
  // 2. Find the employee record for this member within the project's organization
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          project.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  // Employee must have status 'active' to start timers
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 403);
  }
  // 3. Check no existing running timer for this employee
  const existingRunningTimer =
    await MyGlobal.prisma.hrm_time_tracking_timers.findFirst({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        status: "running",
      },
      select: { id: true },
    });
  if (existingRunningTimer !== null) {
    throw new HttpException(
      "You must stop or discard the existing timer before starting a new one",
      400,
    );
  }
  // 4. Check the employee is an active member of the project
  const projectMember =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.body.projectId,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (projectMember === null) {
    throw new HttpException(
      "You are not assigned to the selected project",
      403,
    );
  }
  // 5. If taskId provided, verify the task exists and belongs to the specified project
  if (props.body.taskId !== null && props.body.taskId !== undefined) {
    const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirst({
      where: {
        id: props.body.taskId,
        hrm_time_tracking_project_id: props.body.projectId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (task === null) {
      throw new HttpException(
        "Task not found or does not belong to the specified project",
        400,
      );
    }
  }
  // 6. Create the timer using the Collector, then transform for response
  const record = await MyGlobal.prisma.hrm_time_tracking_timers.create({
    data: await HrmTimeTrackingTimerCollector.collect({
      body: props.body,
      hrmTimeTrackingEmployees: { id: employee.id },
      hrmTimeTrackingMemberSessions: { id: props.member.session_id },
    }),
    ...HrmTimeTrackingTimerTransformer.select(),
  });
  return await HrmTimeTrackingTimerTransformer.transform(record);
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
// export async function postHrmTimeTrackingMemberTimers(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingTimer.ICreate;
// }): Promise<IHrmTimeTrackingTimer> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_timers.create({
//     data: await HrmTimeTrackingTimerCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingTimerTransformer.select(),
//   });
//   return await HrmTimeTrackingTimerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------