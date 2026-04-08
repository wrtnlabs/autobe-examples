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
import { HrmActiveTimerCollector } from "../collectors/HrmActiveTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmActiveTimerTransformer } from "../transformers/HrmActiveTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberActiveTimers(props: {
  member: MemberPayload;
  body: IHrmActiveTimer.ICreate;
}): Promise<IHrmActiveTimer> {
  // Step 1: Get employee record and verify active status
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee must be active to start a timer", 403);
  }
  // Step 2: Check for existing active timer (unique constraint on employee_id)
  const existingTimer = await MyGlobal.prisma.hrm_active_timers.findUnique({
    where: {
      employee_id: employee.id,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("Employee already has an active timer", 409);
  }
  // Step 3: Validate project exists and belongs to employee's organization
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: {
      id: props.body.projectId,
    },
    select: {
      id: true,
      hrm_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.hrm_organization_id !== employee.organization_id) {
    throw new HttpException(
      "Project does not belong to your organization",
      403,
    );
  }
  // Step 4: Validate task if provided
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    const task = await MyGlobal.prisma.hrm_tasks.findUnique({
      where: {
        id: props.body.taskId,
      },
      select: {
        id: true,
        project_id: true,
        deleted_at: true,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.deleted_at !== null) {
      throw new HttpException("Task has been deleted", 410);
    }
    if (task.project_id !== props.body.projectId) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Step 5: Create active timer using collector
  const record = await MyGlobal.prisma.hrm_active_timers.create({
    data: await HrmActiveTimerCollector.collect({
      body: props.body,
      employee: { id: employee.id },
    }),
    ...HrmActiveTimerTransformer.select(),
  });
  // Step 6: Transform and return response
  return await HrmActiveTimerTransformer.transform(record);
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
// export async function postHrmMemberActiveTimers(props: {
//   member: MemberPayload;
//   body: IHrmActiveTimer.ICreate;
// }): Promise<IHrmActiveTimer> {
//   const record = await MyGlobal.prisma.hrm_active_timers.create({
//     data: await HrmActiveTimerCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmActiveTimerTransformer.select(),
//   });
//   return await HrmActiveTimerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------