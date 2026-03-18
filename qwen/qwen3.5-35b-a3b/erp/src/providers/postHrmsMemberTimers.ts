import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsTimerCollector } from "../collectors/HrmsTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimerTransformer } from "../transformers/HrmsTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberTimers(props: {
  member: MemberPayload;
  body: IHrmsTimer.ICreate;
}): Promise<IHrmsTimer> {
  // 1. Validate employee exists and is active
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.member.id },
    select: {
      id: true,
      status: true,
      deleted_at: true,
      organization_member_id: true,
    },
  });
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee has been deactivated", 403);
  }
  // 2. Validate project exists and belongs to employee's organization
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
    select: { id: true, hrms_organization_id: true },
  });
  if (project.hrms_organization_id !== employee.organization_member_id) {
    throw new HttpException(
      "Project does not belong to employee organization",
      403,
    );
  }
  // 3. Validate employee is an active member of the project
  const projectMember =
    await MyGlobal.prisma.hrms_project_members.findFirstOrThrow({
      where: {
        employee_id: props.member.id,
        project_id: props.body.project_id,
        status: "active",
      },
      select: { id: true, status: true },
    });
  if (projectMember.status !== "active") {
    throw new HttpException(
      "Employee is not an active member of this project",
      403,
    );
  }
  // 4. Validate employee has no active timer
  const existingTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      employee: { id: props.member.id },
      deleted_at: null,
    },
    select: { id: true, deleted_at: true },
  });
  if (existingTimer !== null) {
    throw new HttpException("Employee already has an active timer", 400);
  }
  // 5. If task is provided, validate it exists and belongs to the selected project
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
      where: {
        id: props.body.task_id,
        project: { id: props.body.project_id },
      },
    });
  }
  // 6. Create timer using collector
  const created = await MyGlobal.prisma.hrms_timers.create({
    data: await HrmsTimerCollector.collect({
      body: props.body,
      hrmsEmployees: { id: employee.id } satisfies IEntity,
      hrmsMemberSessions: { id: props.member.session_id } satisfies IEntity,
    }),
    ...HrmsTimerTransformer.select(),
  });
  // 7. Return transformed timer
  return await HrmsTimerTransformer.transform(created);
}
