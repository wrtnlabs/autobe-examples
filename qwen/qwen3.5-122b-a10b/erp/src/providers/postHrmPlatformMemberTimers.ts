import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
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
  // Resolve employee from member
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    } satisfies Prisma.hrm_platform_employeesFindFirstOrThrowArgs);
  // Check for existing active timer (single active timer constraint)
  const existingTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
  } satisfies Prisma.hrm_platform_timersFindManyArgs);
  if (existingTimer !== null) {
    throw new HttpException("You already have an active timer", 409);
  }
  // Validate project exists
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
  } satisfies Prisma.hrm_platform_projectsFindUniqueOrThrowArgs);
  // Validate employee is a project member
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.body.project_id,
        deleted_at: null,
      },
    } satisfies Prisma.hrm_platform_project_membersFindManyArgs);
  if (projectMember === null) {
    throw new HttpException("You are not a member of this project", 403);
  }
  // Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        hrm_platform_projects_id: props.body.project_id,
        deleted_at: null,
      },
    } satisfies Prisma.hrm_platform_tasksFindManyArgs);
  }
  // Create timer using collector
  const timer = await MyGlobal.prisma.hrm_platform_timers.create({
    data: await HrmPlatformTimerCollector.collect({
      body: props.body,
      employee: employee as IEntity,
    }),
    ...HrmPlatformTimerTransformer.select(),
  } satisfies Prisma.hrm_platform_timersCreateArgs);
  return await HrmPlatformTimerTransformer.transform(timer);
}
