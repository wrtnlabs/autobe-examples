import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTimerCollector } from "../collectors/HrmPlatformTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimers(props: {
  member: MemberPayload;
  body: IHrmPlatformTimer.ICreate;
}): Promise<IHrmPlatformTimer> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        hrm_platform_organization_id: true,
      },
    });
  if (employee.status !== "active") {
    throw new HttpException("Employee must be active to create timers", 400);
  }
  const existingActiveTimer =
    await MyGlobal.prisma.hrm_platform_timers.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        status: { in: ["started", "paused"] },
        deleted_at: null,
      },
    });
  if (existingActiveTimer !== null) {
    throw new HttpException("Employee already has an active timer", 400);
  }
  if (
    props.body.hrm_platform_project_id !== null &&
    props.body.hrm_platform_project_id !== undefined
  ) {
    const project =
      await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
        where: { id: props.body.hrm_platform_project_id },
        select: {
          id: true,
          organization_id: true,
        },
      });
    if (project.organization_id !== employee.hrm_platform_organization_id) {
      throw new HttpException(
        "Project must belong to the same organization",
        400,
      );
    }
  }
  if (
    props.body.hrm_platform_task_id !== null &&
    props.body.hrm_platform_task_id !== undefined
  ) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.hrm_platform_task_id },
      select: {
        id: true,
        project_id: true,
        project: { select: { organization_id: true } },
      },
    });
    if (task.project_id !== null) {
      const project =
        await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
          where: { id: task.project_id },
          select: { organization_id: true },
        });
      if (project.organization_id !== employee.hrm_platform_organization_id) {
        throw new HttpException(
          "Task must belong to the same organization",
          400,
        );
      }
    }
  }
  const record = await MyGlobal.prisma.hrm_platform_timers.create({
    data: await HrmPlatformTimerCollector.collect({
      body: props.body,
      hrmPlatformEmployees: {
        id: employee.id,
      } satisfies IEntity,
    }),
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(record);
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
// export async function postHrmPlatformMemberTimers(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimer.ICreate;
// }): Promise<IHrmPlatformTimer> {
//   const record = await MyGlobal.prisma.hrm_platform_timers.create({
//     data: await HrmPlatformTimerCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformTimerTransformer.select(),
//   });
//   return await HrmPlatformTimerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------