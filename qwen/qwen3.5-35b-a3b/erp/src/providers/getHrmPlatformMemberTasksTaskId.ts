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
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTask> {
  const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      is_pending: false,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_project_id: task.project_id,
        hrm_platform_employee_id: employee.id,
      },
    });
  if (!projectMembership) {
    throw new HttpException("Access denied: not a project member", 403);
  }
  return await HrmPlatformTaskAtSummaryTransformer.transform(task);
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
// export async function getHrmPlatformMemberTasksTaskId(props: {
//   member: MemberPayload;
//   taskId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformTask> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------