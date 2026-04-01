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

export async function patchErpHrmTimeTrackingMemberTimesheetVersioningLocks(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate;
}): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  return MyGlobal.prisma.$transaction(async (tx) => {
    const existing =
      await tx.erp_hrm_time_tracking_timesheet_versioning_locks.findFirstOrThrow(
        {
          where: {
            locked_by_user_id: props.member.id,
            deleted_at: null,
          },
          select: {
            id: true,
            timesheet_id: true,
            locked_by_user_id: true,
            lock_reason: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    if (existing.locked_by_user_id !== props.member.id) {
      throw new HttpException("Forbidden: lock ownership mismatch", 403);
    }
    const data: {
      lock_reason?: typeof existing.lock_reason;
      deleted_at?: Date | null;
      updated_at: Date;
    } = {
      updated_at: new Date(),
      ...(props.body.lock_reason !== undefined
        ? { lock_reason: props.body.lock_reason }
        : {}),
      ...(props.body.deleted_at !== undefined
        ? {
            deleted_at:
              props.body.deleted_at === null
                ? null
                : new Date(props.body.deleted_at),
          }
        : {}),
    };
    await tx.erp_hrm_time_tracking_timesheet_versioning_locks.update({
      where: { id: existing.id },
      data,
    });
    const reloaded =
      await tx.erp_hrm_time_tracking_timesheet_versioning_locks.findUniqueOrThrow(
        {
          where: { id: existing.id },
          select: {
            id: true,
            timesheet_id: true,
            locked_by_user_id: true,
            lock_reason: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    return {
      id: reloaded.id,
      timesheet_id: reloaded.timesheet_id,
      locked_by_user_id: reloaded.locked_by_user_id,
      lock_reason: reloaded.lock_reason,
      created_at: reloaded.created_at.toISOString(),
      updated_at: reloaded.updated_at.toISOString(),
      deleted_at: reloaded.deleted_at
        ? reloaded.deleted_at.toISOString()
        : null,
    };
  });
}
