import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  // Get the member session to find employee_id
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { member_id: true },
    });
  // Find the employee record for this member
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: session.member_id,
        deleted_at: null,
      },
      select: { id: true, status: true },
    });
  // Verify employee is active
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // Check if employee already has an active timer
  const existingTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("Employee already has an active timer", 409);
  }
  // Verify project membership exists
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirstOrThrow({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.body.project_id,
        deleted_at: null,
      },
    });
  // If task_id provided, verify task belongs to project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        hrm_platform_project_id: props.body.project_id,
      },
    });
  }
  // Create timer using collector
  const created = await MyGlobal.prisma.hrm_platform_timers.create({
    data: await HrmPlatformTimerCollector.collect({
      body: props.body,
      hrmPlatformEmployees: { id: employee.id },
    }),
    ...HrmPlatformTimerTransformer.select(),
  });
  // Transform and return
  return await HrmPlatformTimerTransformer.transform(created);
}
