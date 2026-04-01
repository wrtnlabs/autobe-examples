import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimesheetVersioningLockTransformer } from "../transformers/ErpHrmTimeTrackingTimesheetVersioningLockTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberTimesheetVersioningLocksLockId(props: {
  member: MemberPayload;
  lockId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  const lock =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheet_versioning_locks.findFirstOrThrow(
      {
        where: {
          id: props.lockId,
          deleted_at: null,
        },
        select: {
          ...ErpHrmTimeTrackingTimesheetVersioningLockTransformer.select()
            .select,
          timesheet: {
            select: {
              erp_hrm_time_tracking_organization_id: true,
            },
          },
        },
      },
    );
  if (!lock?.timesheet?.erp_hrm_time_tracking_organization_id) {
    throw new HttpException("Not Found", 404);
  }
  return ErpHrmTimeTrackingTimesheetVersioningLockTransformer.transform(lock);
}
