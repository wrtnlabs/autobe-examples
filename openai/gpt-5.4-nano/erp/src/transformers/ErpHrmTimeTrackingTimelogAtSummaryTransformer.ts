import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "./ErpHrmTimeTrackingTaskAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTimelogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        work_date: true,
        start_time: true,
        end_time: true,
        duration_minutes: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
        // Required Prisma members (not represented in DTO)
        timesheet: { select: { id: true } },
        timelogSnapshots: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_tracking_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimelog.ISummary> {
    return {
      id: input.id,
      work_date: input.work_date.toISOString(),
      start_time: input.start_time?.toISOString() ?? null,
      end_time: input.end_time?.toISOString() ?? null,
      duration_minutes: input.duration_minutes,
      note: input.note,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      // IErpHrmTimeTrackingOrganization.ISummary is defined as an empty object
      organization: {} as IErpHrmTimeTrackingOrganization.ISummary,
      employee: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task:
        input.task === null
          ? null
          : await ErpHrmTimeTrackingTaskAtSummaryTransformer.transform(
              input.task,
            ),
    };
  }
}
