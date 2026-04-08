import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogTransformer } from "../transformers/ErpHrmTimeTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimersStop(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTimelog> {
  const stopped = await MyGlobal.prisma.$transaction(async (tx) => {
    const member = await tx.erp_hrm_time_members.findFirstOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
      },
    });
    const timer = await tx.erp_hrm_time_timers.findFirst({
      where: {
        member_id: member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        project_id: true,
        task_id: true,
        description: true,
        started_at: true,
      },
      orderBy: {
        started_at: "desc",
      },
    });
    if (timer === null) throw new HttpException("No running timer", 404);
    const stopMoment = new globalThis.Date();
    const durationMinutes = Math.max(
      1,
      Math.round((stopMoment.getTime() - timer.started_at.getTime()) / 60000),
    );
    await tx.erp_hrm_time_timers.update({
      where: { id: timer.id },
      data: {
        deleted_at: stopMoment,
        updated_at: stopMoment,
      },
    });
    return await tx.erp_hrm_time_timelogs.create({
      data: {
        id: v4(),
        erp_hrm_time_member_id: member.id,
        erp_hrm_time_project_id: timer.project_id,
        erp_hrm_time_task_id: timer.task_id,
        work_date: timer.started_at,
        duration_minutes: durationMinutes,
        description: timer.description,
        billable: true,
        created_at: stopMoment,
        updated_at: stopMoment,
        deleted_at: null,
      },
      ...ErpHrmTimeTimelogTransformer.select(),
    });
  });
  return await ErpHrmTimeTimelogTransformer.transform(stopped);
}
