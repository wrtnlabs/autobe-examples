import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimer.IUpdate;
}): Promise<IHrmPlatformTimer> {
  // Step 1: Fetch timer with employee relation for ownership validation
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      status: true,
      hrm_platform_employee_id: true,
      deleted_at: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      employee: {
        select: {
          organization: { select: { id: true } },
        },
      },
    },
  });
  // Step 2: Verify timer is not soft-deleted (404 if deleted)
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer not found", 404);
  }
  // Step 3: Verify ownership (403 if belongs to different employee)
  if (timer.hrm_platform_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Verify timer is not stopped (403 for immutable state)
  if (timer.status === "stopped") {
    throw new HttpException("Cannot modify stopped timer", 403);
  }
  // Determine the effective project ID after update
  const effectiveProjectId: (string & tags.Format<"uuid">) | null =
    props.body.hrm_platform_project_id !== undefined
      ? (props.body.hrm_platform_project_id ?? null)
      : (timer.hrm_platform_project_id ?? null);
  // Step 5: Get the employee's organization ID for validation
  const organizationId: string = timer.employee.organization.id;
  // Step 6: Validate project reference if provided and not null
  if (props.body.hrm_platform_project_id !== undefined) {
    if (props.body.hrm_platform_project_id !== null) {
      const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
        where: {
          id: props.body.hrm_platform_project_id,
          organization_id: organizationId,
        },
      });
      if (!project) {
        throw new HttpException("Project not found or not accessible", 400);
      }
    }
  }
  // Step 7: Validate task reference if provided and not null
  if (props.body.hrm_platform_task_id !== undefined) {
    if (props.body.hrm_platform_task_id !== null) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
        where: {
          id: props.body.hrm_platform_task_id,
          ...(effectiveProjectId !== undefined &&
            effectiveProjectId !== null && {
              project_id: effectiveProjectId,
            }),
        },
      });
      if (!task) {
        throw new HttpException("Task not found or not accessible", 400);
      }
      // Validate task's project belongs to the employee's organization
      if (task.project_id) {
        const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
          where: {
            id: task.project_id,
            organization_id: organizationId,
          },
        });
        if (!project) {
          throw new HttpException("Task's project is not accessible", 400);
        }
      }
    }
  }
  // Step 8: Update timer with new project and task associations
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.hrm_platform_project_id !== undefined && {
        hrm_platform_project_id: props.body.hrm_platform_project_id ?? null,
      }),
      ...(props.body.hrm_platform_task_id !== undefined && {
        hrm_platform_task_id: props.body.hrm_platform_task_id ?? null,
      }),
      updated_at: new Date(),
    },
  });
  // Step 9: Fetch updated timer with full relations for transformation
  const updated = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...HrmPlatformTimerTransformer.select(),
  });
  // Step 10: Transform and return result
  return await HrmPlatformTimerTransformer.transform(updated);
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
// import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberTimersTimerId(props: {
//   member: MemberPayload;
//   timerId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimer.IUpdate;
// }): Promise<IHrmPlatformTimer> {
//   await MyGlobal.prisma.hrm_platform_timers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTimerTransformer.select(),
//   });
//   return await HrmPlatformTimerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------