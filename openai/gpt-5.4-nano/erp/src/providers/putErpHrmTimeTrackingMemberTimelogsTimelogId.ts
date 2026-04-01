import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
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

export async function putErpHrmTimeTrackingMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTimelog.IUpdate;
}): Promise<void> {
  await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      deleted_at: true,
      erp_hrm_time_tracking_organization_id: true,
      erp_hrm_time_tracking_employee_id: true,
      erp_hrm_time_tracking_project_id: true,
      erp_hrm_time_tracking_task_id: true,
      erp_hrm_time_tracking_timesheet_id: true,
      start_time: true,
      end_time: true,
      work_date: true,
      duration_minutes: true,
      note: true,
    },
  });
}
