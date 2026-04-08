import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackTimerCollector } from "../collectors/HrmTimeTrackTimerCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimerTransformer } from "../transformers/HrmTimeTrackTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberTimers(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTimer.ICreate;
}): Promise<IHrmTimeTrackTimer> {
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findUnique({
    where: {
      id: props.member.id,
    },
    select: {
      id: true,
      hrm_time_track_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const existingActiveTimer =
    await MyGlobal.prisma.hrm_time_track_timers.findFirst({
      where: {
        hrm_time_track_employee_id: employee.id,
        is_active: true,
      },
    });
  if (existingActiveTimer !== null) {
    throw new HttpException(
      "An active timer already exists for this employee",
      409,
    );
  }
  const project = await MyGlobal.prisma.hrm_time_track_projects.findUnique({
    where: {
      id: props.body.project_id,
    },
    select: {
      id: true,
      hrm_time_track_organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (
    project.hrm_time_track_organization_id !==
    employee.hrm_time_track_organization_id
  ) {
    throw new HttpException(
      "Project does not belong to employee's organization",
      422,
    );
  }
  const projectMember =
    await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
      where: {
        hrm_time_track_employee_id: employee.id,
        hrm_time_track_project_id: props.body.project_id,
      },
    });
  if (projectMember === null) {
    throw new HttpException("Employee is not assigned to the project", 422);
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_time_track_tasks.findUnique({
      where: {
        id: props.body.task_id,
      },
      select: {
        id: true,
        hrm_time_track_project_id: true,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.hrm_time_track_project_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the specified project",
        422,
      );
    }
  }
  const record = await MyGlobal.prisma.hrm_time_track_timers.create({
    data: await HrmTimeTrackTimerCollector.collect({
      body: props.body,
      hrmTimeTrackEmployees: employee,
    }),
    ...HrmTimeTrackTimerTransformer.select(),
  });
  return await HrmTimeTrackTimerTransformer.transform(record);
}
