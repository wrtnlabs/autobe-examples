import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectBudgetAlert";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";

export namespace HrmTimeTrackingProjectBudgetAlertTransformer {
  export type Payload =
    Prisma.hrm_time_tracking_project_budget_alertsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        week_start_date: true,
        week_end_date: true,
        actual_hours: true,
        utilization_rate: true,
        threshold_rate: true,
        is_alert: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_project_budget_alertsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingProjectBudgetAlert> {
    return {
      id: input.id,
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      actual_hours: input.actual_hours,
      utilization_rate: input.utilization_rate,
      threshold_rate: input.threshold_rate,
      is_alert: input.is_alert,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
