import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        reviewer: HrmPlatformMemberAtSummaryTransformer.select(),
        timelogs: {
          select: {
            id: true,
            duration_minutes: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheet.ISummary> {
    return {
      id: input.id,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      status: input.status as "draft" | "submitted" | "approved" | "rejected",
      total_hours:
        input.timelogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewer: input.reviewer
        ? await HrmPlatformMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
    } satisfies IHrmPlatformTimesheet.ISummary;
  }
}
