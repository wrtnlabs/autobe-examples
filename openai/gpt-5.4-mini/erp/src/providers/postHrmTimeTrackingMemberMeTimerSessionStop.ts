import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberMeTimerSessionStop(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackingTimelog> {
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const activeTimer =
      await prisma.hrm_time_tracking_timer_sessions.findFirstOrThrow({
        where: {
          hrm_time_tracking_employee_id: props.member.id,
          ended_at: null,
          discarded_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          hrm_time_tracking_project_id: true,
          hrm_time_tracking_task_id: true,
          description: true,
          started_at: true,
        },
      });
    const stoppedAt = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round(
        (stoppedAt.getTime() - activeTimer.started_at.getTime()) / 60000,
      ),
    );
    await prisma.hrm_time_tracking_timer_sessions.update({
      where: { id: activeTimer.id },
      data: {
        ended_at: stoppedAt,
        updated_at: stoppedAt,
      },
    });
    await prisma.hrm_time_tracking_timelogs.create({
      data: {
        id: v4(),
        organization: { connect: { id: props.member.id } },
        employee: {
          connect: { id: activeTimer.hrm_time_tracking_employee_id },
        },
        project: { connect: { id: activeTimer.hrm_time_tracking_project_id } },
        ...(activeTimer.hrm_time_tracking_task_id === null
          ? {}
          : {
              task: { connect: { id: activeTimer.hrm_time_tracking_task_id } },
            }),
        work_date: stoppedAt,
        duration_minutes: durationMinutes,
        description: activeTimer.description,
        billable: false,
        created_at: stoppedAt,
        updated_at: stoppedAt,
        deleted_at: null,
      },
    });
    const timelog = await prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        employee_id: activeTimer.hrm_time_tracking_employee_id,
        project_id: activeTimer.hrm_time_tracking_project_id,
        created_at: stoppedAt,
      },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
    return timelog;
  });
  return await HrmTimeTrackingTimelogTransformer.transform(created);
}
