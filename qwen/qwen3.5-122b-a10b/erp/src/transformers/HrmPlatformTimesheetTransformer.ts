import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformTimelogTransformer } from "./HrmPlatformTimelogTransformer";

export namespace HrmPlatformTimesheetTransformer {
  export type Payload = Prisma.hrm_platform_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        reviewer: HrmPlatformMemberAtSummaryTransformer.select(),
        timesheetTimelogs: {
          select: {
            timelog: HrmPlatformTimelogTransformer.select(),
          },
        } satisfies Prisma.hrm_platform_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheet> {
    return {
      id: input.id,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewer: input.reviewer
        ? await HrmPlatformMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      status: input.status,
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
      rejection_reason: input.rejection_reason ?? null,
      total_hours:
        input.timesheetTimelogs.reduce(
          (sum, tl) => sum + tl.timelog.duration_minutes,
          0,
        ) / 60,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      timelogs: await ArrayUtil.asyncMap(input.timesheetTimelogs, (tl) =>
        HrmPlatformTimelogTransformer.transform(tl.timelog),
      ),
    };
  }
}
