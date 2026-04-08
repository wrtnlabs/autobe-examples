import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimerTransformer } from "../transformers/ErpHrmTimeTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimersDiscard(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTimer> {
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  const activeTimer = await MyGlobal.prisma.erp_hrm_time_timers.findFirst({
    where: {
      member_id: member.id,
      deleted_at: null,
    },
    ...ErpHrmTimeTimerTransformer.select(),
  });
  if (activeTimer === null) {
    throw new HttpException("Running timer not found", 404);
  }
  const discarded = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_timers.update({
      where: {
        id: activeTimer.id,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    return await prisma.erp_hrm_time_timers.findUniqueOrThrow({
      where: {
        id: activeTimer.id,
      },
      ...ErpHrmTimeTimerTransformer.select(),
    });
  });
  return await ErpHrmTimeTimerTransformer.transform(discarded);
}
