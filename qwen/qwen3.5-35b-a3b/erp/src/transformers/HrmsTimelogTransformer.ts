import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsTimelogTransformer {
  export type Payload = Prisma.hrms_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        billable: true,
        created_at: true,
        date: true,
        description: true,
        duration_minutes: true,
        updated_at: true,
        deleted_at: true,
        employee: true,
        project: true,
        task: true,
      },
    } satisfies Prisma.hrms_timelogsFindManyArgs;
  }
  export async function transform(input: Payload[]): Promise<IHrmsTimelog> {
    // Compute current week (Monday-Sunday) from Asia/Seoul timezone
    const now = new Date();
    const utcOffset = 9 * 60 * 60 * 1000; // KST offset
    const kstDate = new Date(now.getTime() + utcOffset);
    const dayOfWeek = kstDate.getDay(); // 0 = Sunday, 1 = Monday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(kstDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const current_week: IWeekRange = {
      start_date: monday.toISOString().split("T")[0],
      end_date: sunday.toISOString().split("T")[0],
    };
    // Filter timelogs for current week
    const filteredTimelogs = input.filter(
      (t: Payload) =>
        t.date >= monday && t.date <= sunday && t.deleted_at === null,
    );
    // Calculate current_week_hours
    const current_week_hours =
      filteredTimelogs.reduce(
        (sum: number, t: Payload) => sum + t.duration_minutes,
        0,
      ) / 60;
    // Compute aggregated metrics (would require additional database queries in production)
    // These fields represent organization-level metrics that require multi-table aggregation
    const active_employees_count = 0; // Requires: SELECT COUNT(*) FROM hrms_employees WHERE status='active'
    const pending_timesheets_count = 0; // Requires: SELECT COUNT(*) FROM hrms_timesheets WHERE status='submitted'
    const projects_with_high_utilization: IHrmsProject.ISummary[] = [];
    // Return aggregated metrics
    return {
      active_employees_count,
      current_week_hours,
      pending_timesheets_count,
      projects_with_high_utilization,
      current_week,
      generated_at: toISOStringSafe(kstDate),
    };
  }
}
