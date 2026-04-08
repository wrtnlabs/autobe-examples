import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTaskCollector } from "../collectors/HrmPlatformTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTasks(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  body: IHrmPlatformTask.ICreate;
}): Promise<IHrmPlatformTask> {
  // Validate project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.body.project_id },
      select: { id: true, organization_id: true },
    },
  );
  // Validate parent_task_id if provided
  if (props.body.parent_task_id) {
    const parentTask =
      await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: props.body.parent_task_id },
        select: {
          id: true,
          project_id: true,
          childrenTasks: { select: { id: true } },
        },
      });
    // Parent must belong to same project
    if (parentTask.project_id !== props.body.project_id) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    // Parent must be a root task (no existing children)
    if (parentTask.childrenTasks.length > 0) {
      throw new HttpException(
        "Cannot assign subtask to a task that already has children",
        400,
      );
    }
  }
  // Validate assigned_employee_id if provided
  if (props.body.assigned_employee_id) {
    const employee =
      await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
        where: { id: props.body.assigned_employee_id },
        select: { id: true, organization: { select: { id: true } } },
      });
    // Employee must belong to same organization as project
    if (employee.organization.id !== project.organization_id) {
      throw new HttpException(
        "Assigned employee must belong to the same organization as the project",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(record);
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
// export async function postHrmPlatformMemberTasks(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTask.ICreate;
// }): Promise<IHrmPlatformTask> {
//   const record = await MyGlobal.prisma.hrm_platform_tasks.create({
//     data: await HrmPlatformTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformTaskTransformer.select(),
//   });
//   return await HrmPlatformTaskTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------