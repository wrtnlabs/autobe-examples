import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerTimesheetAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
        reviewer: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_tracker_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerTimesheet.ISummary> {
    return {
      id: input.id,
      employee_id: input.employee.id,
      organization_id: input.organization.id,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      status: typia.assert<"submitted" | "draft" | "approved" | "rejected">(
        input.status,
      ),
      total_hours: input.total_hours,
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
    };
  }
}
