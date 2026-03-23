import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";

export namespace HrmPlatformTimesheetSnapshotTransformer {
  export type Payload = Prisma.hrm_platform_timesheet_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timesheet: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_timesheetsFindManyArgs,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        approver: HrmPlatformEmployeeAtSummaryTransformer.select(),
        rejectedBy: HrmPlatformEmployeeAtSummaryTransformer.select(),
        week_start_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        rejection_reason: true,
        deleted_at: true,
        created_at: true,
      },
    } satisfies Prisma.hrm_platform_timesheet_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheetSnapshot> {
    return {
      id: input.id,
      hrm_platform_timesheet_id: input.timesheet.id,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      approver: input.approver
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.approver,
          )
        : null,
      rejectedBy: input.rejectedBy
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.rejectedBy,
          )
        : null,
      week_start_date: toISOStringSafe(input.week_start_date),
      status: input.status,
      total_hours: input.total_hours,
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      approved_at: input.approved_at
        ? toISOStringSafe(input.approved_at)
        : null,
      rejected_at: input.rejected_at
        ? toISOStringSafe(input.rejected_at)
        : null,
      rejection_reason: input.rejection_reason ?? null,
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
