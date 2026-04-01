import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberTimerSessionsTimerSessionId(props: {
  member: MemberPayload;
  timerSessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimerSession> {
  // Ensure member exists and is not soft-deleted
  await MyGlobal.prisma.erp_hrm_time_tracking_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const timerSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_timer_sessions.findUniqueOrThrow(
      {
        where: {
          id: props.timerSessionId,
        },
      },
    );
  // Access control: only the owning employee can read this session
  if (timerSession.employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // NOTE: Do not use typia.assert/guard for Prisma types.
  return timerSession as unknown as IErpHrmTimeTrackingTimerSession;
}
