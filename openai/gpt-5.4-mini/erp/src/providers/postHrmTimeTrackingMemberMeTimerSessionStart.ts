import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimerSessionTransformer } from "../transformers/HrmTimeTrackingTimerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberMeTimerSessionStart(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimerSession.ICreate;
}): Promise<IHrmTimeTrackingTimerSession> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        user_account_id: true,
        status: true,
      },
    });
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        organization_id: true,
      },
    });
  if (project.status !== "active") {
    throw new HttpException("Project is not available for live tracking", 400);
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        hrm_time_tracking_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_project_id: true,
      },
    });
  }
  const active =
    await MyGlobal.prisma.hrm_time_tracking_timer_sessions.findFirst({
      where: {
        hrm_time_tracking_employee_id: employee.id,
        ended_at: null,
        discarded_at: null,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (active !== null) {
    throw new HttpException(
      "An active timer already exists for this employee",
      409,
    );
  }
  const now = new Date();
  const created = await MyGlobal.prisma.hrm_time_tracking_timer_sessions.create(
    {
      data: {
        id: v4(),
        hrm_time_tracking_employee_id: employee.id,
        hrm_time_tracking_project_id: props.body.project_id,
        ...(props.body.task_id !== undefined && props.body.task_id !== null
          ? { hrm_time_tracking_task_id: props.body.task_id }
          : {}),
        started_at: now,
        description: props.body.description ?? null,
        ended_at: null,
        discarded_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...HrmTimeTrackingTimerSessionTransformer.select(),
    },
  );
  return await HrmTimeTrackingTimerSessionTransformer.transform(created);
}
