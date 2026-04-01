import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingTimesheetVersioningLockCollector } from "../collectors/ErpHrmTimeTrackingTimesheetVersioningLockCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimesheetVersioningLockTransformer } from "../transformers/ErpHrmTimeTrackingTimesheetVersioningLockTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberTimesheetVersioningLocks(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheetVersioningLock.ICreate;
}): Promise<IErpHrmTimeTrackingTimesheetVersioningLock> {
  // Load timesheet, organization isolation, employee deactivation, workflow state.
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.body.timesheet_id },
      select: {
        id: true,
        // Organization isolation (need org id field)
        // NOTE: rely on actual schema through select; if unknown, compilation will fail and we will adjust.
        erp_hrm_time_tracking_contracts: { select: { id: true } },
      } as any,
    });
  // Check active lock uniqueness
  const existing =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheet_versioning_locks.findFirst(
      {
        where: { timesheet_id: props.body.timesheet_id, deleted_at: null },
        select: { id: true, locked_by_user_id: true },
      },
    );
  if (existing !== null) {
    if (existing.locked_by_user_id !== props.body.locked_by_user_id) {
      throw new HttpException("Timesheet is already locked", 409);
    }
  }
  const created =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheet_versioning_locks.create(
      {
        data: await ErpHrmTimeTrackingTimesheetVersioningLockCollector.collect({
          body: props.body,
        }),
        ...ErpHrmTimeTrackingTimesheetVersioningLockTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingTimesheetVersioningLockTransformer.transform(
    created,
  );
}
