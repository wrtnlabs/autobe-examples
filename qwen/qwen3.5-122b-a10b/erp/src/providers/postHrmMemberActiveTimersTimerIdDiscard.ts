import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberActiveTimersTimerIdDiscard(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the timer and verify it exists (throws 404 if not found)
  const timer = await MyGlobal.prisma.hrm_active_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: { employee_id: true },
  });
  // Get the employee record for this authenticated member
  const employee = await MyGlobal.prisma.hrm_employees.findFirstOrThrow({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  // Verify ownership - timer must belong to this employee
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the timer record (no timelog created, just discard)
  await MyGlobal.prisma.hrm_active_timers.delete({
    where: { id: props.timerId },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberActiveTimersTimerIdDiscard(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------