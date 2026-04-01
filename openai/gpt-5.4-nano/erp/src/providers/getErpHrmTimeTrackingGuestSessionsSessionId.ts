import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmTimeTrackingTimerSessionTransformer } from "../transformers/ErpHrmTimeTrackingTimerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimerSession> {
  const guestSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_guest_sessions.findUniqueOrThrow(
      {
        where: { id: props.guest.session_id },
        select: {
          id: true,
          created_at: true,
          ip: true,
          href: true,
          referrer: true,
          expired_at: true,
          erp_hrm_time_tracking_guest_id: true,
        },
      },
    );
  const timerSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_timer_sessions.findUniqueOrThrow(
      {
        where: { id: props.sessionId },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          description: true,
          is_active: true,
          employee_id: true,
          project_id: true,
          task_id: true,
          started_at: true,
          organization_id: true,
          ended_at: true,
          ...ErpHrmTimeTrackingTimerSessionTransformer.select(),
        },
      },
    );
  if (timerSession.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  void guestSession;
  const employee =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: timerSession.employee_id },
      select: { id: true, deleted_at: true },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ErpHrmTimeTrackingTimerSessionTransformer.transform(
    timerSession,
  );
}
