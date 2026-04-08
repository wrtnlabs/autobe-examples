import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmActiveTimerTransformer } from "../transformers/HrmActiveTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberActiveTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmActiveTimer.IUpdate;
}): Promise<IHrmActiveTimer> {
  // Step 1: Find the employee record for the authenticated member with organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true, organization_id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 2: Verify the timer exists and belongs to this employee
  const timer = await MyGlobal.prisma.hrm_active_timers.findUnique({
    where: { id: props.timerId },
    select: { id: true, employee_id: true, project_id: true, task_id: true },
  });
  if (timer === null) {
    throw new HttpException("Active timer not found", 404);
  }
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate the project exists and belongs to the same organization
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: { id: props.body.project_id },
    select: { id: true, hrm_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.hrm_organization_id !== employee.organization_id) {
    throw new HttpException(
      "Project does not belong to your organization",
      400,
    );
  }
  // Step 4: If task_id is provided, validate it belongs to the specified project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { id: true, project_id: true },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  // Step 5: Update the timer
  await MyGlobal.prisma.hrm_active_timers.update({
    where: { id: props.timerId },
    data: {
      description: props.body.description,
      project_id: props.body.project_id,
      task_id: props.body.task_id ?? null,
      updated_at: new Date(),
    },
  });
  // Step 6: Return the updated timer
  const updated = await MyGlobal.prisma.hrm_active_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...HrmActiveTimerTransformer.select(),
  });
  return await HrmActiveTimerTransformer.transform(updated);
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
// import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberActiveTimersTimerId(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
//   body: IHrmActiveTimer.IUpdate;
// }): Promise<IHrmActiveTimer> {
//   await MyGlobal.prisma.hrm_active_timers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_active_timers.findUniqueOrThrow({
//     where: { ... },
//     ...HrmActiveTimerTransformer.select(),
//   });
//   return await HrmActiveTimerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------