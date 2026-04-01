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

export async function putErpHrmTimeTrackingMemberTimesheetVersioningLocksLockId(props: {
  member: MemberPayload;
  lockId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate;
}): Promise<void> {
  const lock =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheet_versioning_locks.findUnique(
      {
        where: { id: props.lockId },
        select: {
          id: true,
          timesheet_id: true,
          locked_by_user_id: true,
          deleted_at: true,
          updated_at: true,
          timesheet: {
            select: {
              erp_hrm_time_tracking_organization_id: true,
            },
          },
        },
      },
    );
  if (!lock) {
    // match findUniqueOrThrow behavior
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheet_versioning_locks.findUniqueOrThrow(
      { where: { id: props.lockId }, select: { id: true } },
    );
  }
  if (lock!.locked_by_user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (lock!.deleted_at !== null && props.body.deleted_at === undefined) {
    throw new HttpException("Lock is released", 409);
  }
  const nowIso = toISOStringSafe(lock!.updated_at);
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_timesheet_versioning_locks.update({
      where: { id: props.lockId },
      data: {
        ...(props.body.lock_reason !== undefined && {
          lock_reason: props.body.lock_reason,
        }),
        ...(props.body.deleted_at !== undefined && {
          deleted_at: props.body.deleted_at,
        }),
        updated_at: nowIso,
      },
    });
  });
}
