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
  // 1. Find employee for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // 2. Check for existing active timer (single active timer enforcement)
  const existingTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("You already have an active timer", 409);
  }
  // 3. Validate project exists and belongs to employee's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
    where: {
      id: props.body.project_id,
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (project === null) {
    throw new HttpException(
      "Project not found or not in your organization",
      404,
    );
  }
  // 4. Verify employee is a member of the project
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.body.project_id,
        hrm_platform_employee_id: employee.id,
        deleted_at: null,
      },
    });
  if (projectMember === null) {
    throw new HttpException("You are not a member of this project", 403);
  }
  // 5. Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
      where: {
        id: props.body.task_id,
        hrm_platform_projects_id: props.body.project_id,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException(
        "Task not found or does not belong to the selected project",
        404,
      );
    }
  }
  // 6. Create timer using collector
  const timerData = await HrmPlatformTimerCollector.collect({
    body: props.body,
    employee: employee,
  });
  const timer = await MyGlobal.prisma.hrm_platform_timers.create({
    data: timerData,
    ...HrmPlatformTimerTransformer.select(),
  });
  // 7. Transform and return
  return await HrmPlatformTimerTransformer.transform(timer);
}
