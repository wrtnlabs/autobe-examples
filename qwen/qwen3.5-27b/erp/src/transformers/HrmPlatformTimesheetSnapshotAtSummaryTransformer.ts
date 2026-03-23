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

export namespace HrmPlatformTimesheetSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_timesheet_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timesheet: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timesheetsFindManyArgs,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        week_start_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        rejection_reason: true,
        deleted_at: true,
        created_at: true,
        approver: HrmPlatformEmployeeAtSummaryTransformer.select(),
        rejectedBy: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employeesFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_timesheet_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheetSnapshot.ISummary> {
    return {
      id: input.id,
      hrm_platform_timesheet_id: input.timesheet.id,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      week_start_date: input.week_start_date.toISOString(),
      status: input.status,
      total_hours: input.total_hours,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      approved_at: input.approved_at?.toISOString() ?? null,
      rejected_at: input.rejected_at?.toISOString() ?? null,
      approver: input.approver
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            input.approver,
          )
        : null,
      rejection_reason: input.rejection_reason,
      created_at: input.created_at.toISOString(),
    };
  }
}
