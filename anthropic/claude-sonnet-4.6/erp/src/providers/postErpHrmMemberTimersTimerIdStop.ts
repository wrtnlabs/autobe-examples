import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimersTimerIdStop(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  // 1. Lookup timer — 404 if not found
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUnique({
    where: { id: props.timerId },
    select: {
      id: true,
      organization_member_id: true,
      project_id: true,
      task_id: true,
      description: true,
      started_at: true,
    },
  });
  if (timer === null) {
    throw new HttpException("Timer not found", 404);
  }
  // 2. Resolve the timer owner's organization
  const timerOwnerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: timer.organization_member_id },
      select: { organization_id: true },
    });
  // Find the calling member's org-member record within the same organization
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findUnique({
      where: {
        organization_id_member_id: {
          organization_id: timerOwnerOrgMember.organization_id,
          member_id: props.member.id,
        },
      },
      select: { id: true, role_id: true },
    });
  if (callerOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Authorization: owner OR holds time:manage permission
  const isOwner = timer.organization_member_id === callerOrgMember.id;
  if (!isOwner) {
    const hasTimeManage =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          role_id: callerOrgMember.role_id,
          permission_code: "time:manage",
        },
        select: { id: true },
      });
    if (hasTimeManage === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Compute elapsed duration in whole minutes (standard rounding)
  const stopTimestamp = new Date();
  const elapsedMs = stopTimestamp.getTime() - timer.started_at.getTime();
  const duration_minutes = Math.round(elapsedMs / 60000);
  // 5. Reject if elapsed time rounds to zero (timer stopped almost immediately)
  if (duration_minutes === 0) {
    throw new HttpException(
      "Elapsed time is too short to record (rounds to 0 minutes)",
      422,
    );
  }
  // 6. Compute work_date as midnight UTC of the stop timestamp
  const workDateMidnightUTC = new Date(
    Date.UTC(
      stopTimestamp.getUTCFullYear(),
      stopTimestamp.getUTCMonth(),
      stopTimestamp.getUTCDate(),
    ),
  );
  // 7. Atomically create timelog and delete timer within a transaction
  const newTimelogId = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_timelogs.create({
      data: {
        id: newTimelogId,
        organization_member_id: timer.organization_member_id,
        project_id: timer.project_id,
        task_id: timer.task_id,
        timesheet_id: null,
        work_date: workDateMidnightUTC,
        duration_minutes,
        billable: true,
        description: timer.description,
        created_at: stopTimestamp,
        updated_at: stopTimestamp,
      },
    });
    await tx.erp_hrm_timers.delete({
      where: { id: props.timerId },
    });
  });
  // 8. Fetch and return the newly created timelog via the transformer
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: newTimelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return ErpHrmTimelogTransformer.transform(timelog);
}
