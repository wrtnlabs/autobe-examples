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
  // Validate employee exists and is active
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      display_name: true,
      position: true,
      department_id: true,
      status: true,
      organization_member_id: true,
    },
  });
  // Validate project exists and belongs to employee's organization
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: {
      id: props.body.project_id,
      hrms_organization_id: employee.organization_member_id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      color_code: true,
      hrms_organization_id: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  });
  // Validate employee is active project member
  const projectMember =
    await MyGlobal.prisma.hrms_project_members.findFirstOrThrow({
      where: {
        employee_id: employee.id,
        project_id: project.id,
        status: "active",
      },
    });
  // Validate employee has no active timer
  const existingTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      employee: { id: employee.id },
      deleted_at: null,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("Employee already has an active timer", 400);
  }
  // Validate task belongs to project if specified
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
      where: {
        id: props.body.task_id,
        project: { id: project.id },
      },
    });
  }
  // Create timer using collector
  const created = await MyGlobal.prisma.hrms_timers.create({
    data: await HrmsTimerCollector.collect({
      body: props.body,
      hrmsEmployees: {
        id: employee.id as string & tags.Format<"uuid">,
      },
    }),
    ...HrmsTimerTransformer.select(),
  });
  return await HrmsTimerTransformer.transform(created);
}
