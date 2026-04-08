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
  const timerWithRelations =
    await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
      where: {
        id: props.timerId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        hrm_platform_employee_id: true,
        employee: {
          select: {
            id: true,
            hrm_platform_organization_id: true,
          },
        },
      },
    });
  if (timerWithRelations.hrm_platform_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timerWithRelations.status === "stopped") {
    throw new HttpException("Cannot update a stopped timer", 400);
  }
  if (props.body.hrm_platform_project_id !== undefined) {
    if (props.body.hrm_platform_project_id !== null) {
      const project =
        await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
          where: { id: props.body.hrm_platform_project_id },
        });
      if (
        project.organization_id !==
        timerWithRelations.employee.hrm_platform_organization_id
      ) {
        throw new HttpException(
          "Project does not belong to employee's organization",
          400,
        );
      }
    }
  }
  if (props.body.hrm_platform_task_id !== undefined) {
    if (props.body.hrm_platform_task_id !== null) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: props.body.hrm_platform_task_id },
        select: {
          id: true,
          project_id: true,
          project: {
            select: {
              organization_id: true,
            },
          },
        },
      });
      if (
        task.project.organization_id !==
        timerWithRelations.employee.hrm_platform_organization_id
      ) {
        throw new HttpException(
          "Task does not belong to employee's organization",
          400,
        );
      }
      if (
        props.body.hrm_platform_project_id !== undefined &&
        props.body.hrm_platform_project_id !== null
      ) {
        if (task.project_id !== props.body.hrm_platform_project_id) {
          throw new HttpException(
            "Task does not belong to the specified project",
            400,
          );
        }
      }
    }
  }
  const updatedTimer = await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      hrm_platform_project_id: props.body.hrm_platform_project_id ?? null,
      hrm_platform_task_id: props.body.hrm_platform_task_id ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(updatedTimer);
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