import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
  // 1. Get the employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member: { id: props.member.id },
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // 2. Check if employee already has an active timer
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
  });
  if (activeTimer !== null) {
    throw new HttpException("Active timer already exists", 409);
  }
  // 3. Validate project assignment
  const projectMembership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.body.projectId,
        deleted_at: null,
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Not assigned to project", 403);
  }
  // 4. Validate task belongs to project (if provided)
  if (props.body.taskId !== null && props.body.taskId !== undefined) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
      where: {
        id: props.body.taskId,
        hrm_platform_project_id: props.body.projectId,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException(
        "Task not found or does not belong to project",
        404,
      );
    }
  }
  // 5. Create the timer using collector
  const created = await MyGlobal.prisma.hrm_platform_timers.create({
    data: await HrmPlatformTimerCollector.collect({
      body: props.body,
      hrmPlatformEmployees: { id: employee.id },
      hrmPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...HrmPlatformTimerTransformer.select(),
  });
  // 6. Transform and return
  return await HrmPlatformTimerTransformer.transform(created);
}
