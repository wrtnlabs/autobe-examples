import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerAtStopTransformer } from "../transformers/ErpHrmTimerAtStopTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimersTimerIdStop(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimer.IStop> {
  // Find the timer and verify it exists (404 if not found)
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      organization_member_id: true,
      project_id: true,
      task_id: true,
      started_at: true,
      description: true,
    },
  });
  // Verify the timer belongs to the authenticated member
  // Find organization_member record for this user to get the membership id
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (organizationMember === null) {
    throw new HttpException("Organization member not found", 403);
  }
  if (timer.organization_member_id !== organizationMember.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate duration in minutes, rounded to nearest minute
  const endTime = new Date();
  const durationMs = endTime.getTime() - timer.started_at.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  // Create timelog and delete timer in atomic transaction
  const [createdTimelog] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_timelogs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_member_id: timer.organization_member_id,
        project_id: timer.project_id,
        task_id: timer.task_id,
        timesheet_id: null,
        start_time: timer.started_at,
        end_time: endTime,
        duration_minutes: durationMinutes,
        billable: true,
        description: timer.description,
        created_at: endTime,
        updated_at: endTime,
        deleted_at: null,
      },
      ...ErpHrmTimerAtStopTransformer.select(),
    }),
    MyGlobal.prisma.erp_hrm_timers.delete({
      where: { id: props.timerId },
    }),
  ]);
  return await ErpHrmTimerAtStopTransformer.transform(createdTimelog);
}
