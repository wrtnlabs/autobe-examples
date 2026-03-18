import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimelogTransformer } from "../transformers/ErpHrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberTimerSessionsCurrentStop(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTrackingTimelog> {
  // 1) Resolve current active session
  const activeSessions =
    await MyGlobal.prisma.erp_hrm_time_tracking_timer_sessions.findMany({
      where: {
        employee_id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      take: 2,
    });
  if (activeSessions.length === 0) {
    throw new HttpException("No running timer", 403);
  }
  if (activeSessions.length > 1) {
    throw new HttpException(
      "Data integrity error: multiple active timer sessions",
      500,
    );
  }
  const timerSession =
    activeSessions[0] satisfies (typeof activeSessions)[number];
  const stopAtIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // 2) Compute duration (rounded to nearest minute)
  const startedAtMillis = Date.parse(timerSession.started_at.toISOString());
  const stopAtMillis = Date.parse(stopAtIso);
  if (stopAtMillis < startedAtMillis) {
    throw new HttpException("Invalid timer duration", 400);
  }
  const totalMinutes = (stopAtMillis - startedAtMillis) / 60000;
  const durationMinutes = Math.round(totalMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new HttpException("Failed to calculate duration", 500);
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (prisma) => {
      const createdTimelog = await prisma.erp_hrm_time_tracking_timelogs.create(
        {
          data: {
            id: v4() as string & tags.Format<"uuid">,
            erp_hrm_time_tracking_organization_id: timerSession.organization_id,
            erp_hrm_time_tracking_employee_id: timerSession.employee_id,
            erp_hrm_time_tracking_project_id: timerSession.project_id,
            erp_hrm_time_tracking_task_id: timerSession.task_id ?? null,
            work_date: stopAtIso,
            start_time: timerSession.started_at,
            end_time: new Date(stopAtIso),
            duration_minutes: durationMinutes,
            note: timerSession.description,
            created_at: new Date(stopAtIso),
            updated_at: new Date(stopAtIso),
            deleted_at: null,
          },
          ...ErpHrmTimeTrackingTimelogTransformer.select(),
        },
      );
      await prisma.erp_hrm_time_tracking_timer_sessions.update({
        where: { id: timerSession.id },
        data: {
          ended_at: new Date(stopAtIso),
          is_active: false,
          updated_at: new Date(stopAtIso),
        },
      });
      return createdTimelog;
    });
    return await ErpHrmTimeTrackingTimelogTransformer.transform(created);
  } catch {
    throw new HttpException("Failed to stop timer", 500);
  }
}
