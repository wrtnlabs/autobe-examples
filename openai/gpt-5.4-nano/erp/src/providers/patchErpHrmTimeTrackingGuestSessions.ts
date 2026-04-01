import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingGuestSessions(props: {
  guest: GuestPayload;
  body: IErpHrmTimeTrackingMemberSession.IUpdate;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const memberSession =
      await tx.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow({
        where: { id: props.guest.session_id },
        select: { erp_hrm_time_tracking_members_id: true },
      });
    const activeTimerSession =
      await tx.erp_hrm_time_tracking_timer_sessions.findFirstOrThrow({
        where: {
          employee_id: memberSession.erp_hrm_time_tracking_members_id,
          is_active: true,
          deleted_at: null,
        },
        select: { id: true, organization_id: true },
      });
    if (activeTimerSession.organization_id === props.body.organization_id) {
      return;
    }
    await tx.erp_hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.body.organization_id },
      select: { id: true },
    });
    await tx.erp_hrm_time_tracking_timer_sessions.update({
      where: { id: activeTimerSession.id },
      data: { organization_id: props.body.organization_id },
      select: { id: true },
    });
  });
}
