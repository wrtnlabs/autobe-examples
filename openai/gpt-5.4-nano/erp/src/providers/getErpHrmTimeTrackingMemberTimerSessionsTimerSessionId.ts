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
import { ErpHrmTimeTrackingTimerSessionTransformer } from "../transformers/ErpHrmTimeTrackingTimerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberTimerSessionsTimerSessionId(props: {
  member: MemberPayload;
  timerSessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimerSession> {
  const member = props.member;
  const employee =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirstOrThrow({
      where: {
        id: member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      } as any,
    });
  const timerSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_timer_sessions.findFirstOrThrow(
      {
        where: {
          id: props.timerSessionId,
          organization_id: employee.organization_id,
          employee_id: employee.id,
          deleted_at: null,
        },
        ...(ErpHrmTimeTrackingTimerSessionTransformer.select() as any),
      },
    );
  return await ErpHrmTimeTrackingTimerSessionTransformer.transform(
    timerSession as any,
  );
}
