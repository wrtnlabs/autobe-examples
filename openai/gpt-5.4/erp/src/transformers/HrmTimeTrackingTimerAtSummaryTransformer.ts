import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "./HrmTimeTrackingTaskAtSummaryTransformer";

export namespace HrmTimeTrackingTimerAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingTimer.ISummary> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
      started_at: input.started_at.toISOString(),
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackingTaskAtSummaryTransformer.select(),
        started_at: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_timersFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_timersGetPayload<
    ReturnType<typeof select>
  >;
}
