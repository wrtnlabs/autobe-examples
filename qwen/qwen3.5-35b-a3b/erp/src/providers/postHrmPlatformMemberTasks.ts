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
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTasks(props: {
  member: MemberPayload;
  body: IHrmPlatformTask.ICreate;
}): Promise<IHrmPlatformTask.ISummary> {
  // Validate project exists
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
  });
  // Validate parent task if provided
  if (props.body.parent_task_id) {
    // Parent must exist and be a root task (no parent)
    await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
      where: {
        id: props.body.parent_task_id,
        project_id: props.body.project_id,
        parent_task_id: null,
      },
    });
    // Check parent has no existing children
    const childCount = await MyGlobal.prisma.hrm_platform_tasks.count({
      where: { parent_task_id: props.body.parent_task_id },
    });
    if (childCount > 0) {
      throw new HttpException(
        "Parent task already has children. One level nesting only.",
        400,
      );
    }
  }
  // Validate assigned employee if provided
  if (props.body.assigned_employee_id) {
    const membership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          employee: { id: props.body.assigned_employee_id },
          project: { id: props.body.project_id },
        },
      });
    if (membership === null) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  // Collect the task data
  const data = await HrmPlatformTaskCollector.collect({
    body: props.body,
  });
  // Create the task with full relation select
  const created = await MyGlobal.prisma.hrm_platform_tasks.create({
    data,
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  // Transform and return the full task with proper date conversion
  return await HrmPlatformTaskAtSummaryTransformer.transform(created);
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
//   await MyGlobal.prisma.hrm_platform_tasks.create({
//     data: await HrmPlatformTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------