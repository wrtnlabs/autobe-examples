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
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
        status: "active",
      },
    });
  const existingTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_employee_id: props.member.id,
      status: { in: ["started", "paused"] },
      deleted_at: null,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("Employee already has an active timer", 400);
  }
  if (
    props.body.hrm_platform_project_id !== undefined &&
    props.body.hrm_platform_project_id !== null
  ) {
    const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
      where: {
        id: props.body.hrm_platform_project_id,
      },
      select: {
        organization_id: true,
      },
    });
    if (project === null) {
      throw new HttpException("Project not found", 404);
    }
    if (project.organization_id !== employee.hrm_platform_organization_id) {
      throw new HttpException(
        "Project does not belong to the same organization",
        400,
      );
    }
  }
  if (
    props.body.hrm_platform_task_id !== undefined &&
    props.body.hrm_platform_task_id !== null
  ) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: {
        id: props.body.hrm_platform_task_id,
      },
      select: {
        project_id: true,
        project: {
          select: {
            organization_id: true,
          },
        },
      },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (
      task.project.organization_id !== employee.hrm_platform_organization_id
    ) {
      throw new HttpException(
        "Task does not belong to the same organization",
        400,
      );
    }
    if (
      props.body.hrm_platform_project_id !== undefined &&
      props.body.hrm_platform_project_id !== null &&
      task.project_id !== props.body.hrm_platform_project_id
    ) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  const record = await MyGlobal.prisma.hrm_platform_timers.create({
    data: await HrmPlatformTimerCollector.collect({
      body: props.body,
      hrmPlatformEmployees: employee,
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