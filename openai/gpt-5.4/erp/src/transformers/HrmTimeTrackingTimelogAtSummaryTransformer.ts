import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";

export namespace HrmTimeTrackingTimelogAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        worked_on: true,
        duration_minutes: true,
        description: true,
        billable: true,
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimelog.ISummary> {
    return {
      id: input.id,
      worked_on: input.worked_on.toISOString(),
      duration_minutes: input.duration_minutes,
      description: input.description,
      billable: input.billable,
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
