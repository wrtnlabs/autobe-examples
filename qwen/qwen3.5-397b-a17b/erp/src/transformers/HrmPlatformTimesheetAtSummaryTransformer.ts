import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformTimesheetAtSummaryTransformer {
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
        created_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        reviewedBy: HrmPlatformMemberAtSummaryTransformer.select(),
        timelogs: {
          select: {
            duration_minutes: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheet.ISummary> {
    return {
      id: input.id,
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      total_hours:
        input.timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      reviewer: input.reviewedBy
        ? await HrmPlatformMemberAtSummaryTransformer.transform(
            input.reviewedBy,
          )
        : null,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
