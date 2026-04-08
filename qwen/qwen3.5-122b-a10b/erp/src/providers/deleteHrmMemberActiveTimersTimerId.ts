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

export async function deleteHrmMemberActiveTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 403);
  }
  // Step 2: Find and validate the active timer with project relation
  const timer = await MyGlobal.prisma.hrm_active_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      description: true,
      start_timestamp: true,
      project: {
        select: {
          hrm_organization_id: true,
        },
      } satisfies Prisma.hrm_projectsFindManyArgs,
    },
  });
  // Step 3: Validate ownership
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden: You do not own this timer", 403);
  }
  // Step 4: Validate project belongs to employee's organization
  if (timer.project.hrm_organization_id !== employee.organization_id) {
    throw new HttpException(
      "Invalid project: Project does not belong to your organization",
      400,
    );
  }
  // Step 5: Calculate duration in minutes (rounded to nearest minute)
  const now = new Date();
  const start = new Date(timer.start_timestamp);
  const durationMs = now.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  if (durationMinutes <= 0) {
    throw new HttpException("Timer duration must be greater than 0", 400);
  }
  // Step 6: Create timelog and delete timer in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create timelog entry
    await tx.hrm_timelogs.create({
      data: {
        id: v4(),
        hrm_employee_id: employee.id,
        hrm_project_id: timer.project_id,
        hrm_task_id: timer.task_id,
        date: toISOStringSafe(now),
        duration_minutes: durationMinutes,
        description: timer.description,
        billable: false,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
        deleted_at: null,
      },
    });
    // Delete the active timer
    await tx.hrm_active_timers.delete({
      where: { id: props.timerId },
    });
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
// export async function deleteHrmMemberActiveTimersTimerId(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------