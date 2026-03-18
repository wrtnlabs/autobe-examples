import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimerSessionTransformer } from "../transformers/HrmTimeTrackingTimerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberTimerSessionsTimerSessionId(props: {
  member: MemberPayload;
  timerSessionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimerSession> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const timerSession =
    await MyGlobal.prisma.hrm_time_tracking_timer_sessions.findFirstOrThrow({
      where: {
        id: props.timerSessionId,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      ...HrmTimeTrackingTimerSessionTransformer.select(),
    });
  return await HrmTimeTrackingTimerSessionTransformer.transform(timerSession);
}
