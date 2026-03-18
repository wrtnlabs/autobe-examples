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

export async function postHrmsMemberTimerStart(props: {
  member: MemberPayload;
  body: IHrmsTimer.ICreate;
}): Promise<IHrmsTimer> {
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organizationMember: {
        hrms_member_id: props.member.id,
      },
    },
    include: {
      organizationMember: {
        select: {
          hrms_member_id: true,
        },
      },
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const projectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      employee_id: employee.id,
      project_id: props.body.project_id,
    },
  });
  if (projectMember === null) {
    throw new HttpException("Employee not assigned to project", 403);
  }
  const existingTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      employee: {
        id: employee.id,
      },
      deleted_at: null,
    },
  });
  if (existingTimer !== null) {
    throw new HttpException("Active timer already running", 409);
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrms_tasks.findFirst({
      where: {
        id: props.body.task_id,
        project: {
          id: props.body.project_id,
        },
      },
    });
    if (task === null) {
      throw new HttpException("Task not found in project", 404);
    }
  }
  const created = await MyGlobal.prisma.hrms_timers.create({
    data: await HrmsTimerCollector.collect({
      body: props.body,
      hrmsEmployees: {
        id: employee.id,
      },
      hrmsMemberSessions: {
        id: props.member.session_id,
      },
    }),
    ...HrmsTimerTransformer.select(),
  });
  return await HrmsTimerTransformer.transform(created);
}
