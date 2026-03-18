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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberTimesheetVersioningLocksLockId(props: {
  member: MemberPayload;
  lockId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  const lock =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheet_versioning_locks.findUniqueOrThrow(
      {
        where: { id: props.lockId },
        select: {
          id: true,
          timesheet_id: true,
          locked_by_user_id: true,
          lock_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          timesheet: {
            select: {
              erp_hrm_time_tracking_organization_id: true,
            },
          },
        },
      },
    );
  if (
    lock.timesheet.erp_hrm_time_tracking_organization_id !==
    props.member.session_id
  ) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: lock.id,
    timesheet_id: lock.timesheet_id,
    locked_by_user_id: lock.locked_by_user_id,
    lock_reason: lock.lock_reason,
    created_at: toISOStringSafe(lock.created_at),
    updated_at: toISOStringSafe(lock.updated_at),
    deleted_at: lock.deleted_at ? toISOStringSafe(lock.deleted_at) : null,
  };
}
