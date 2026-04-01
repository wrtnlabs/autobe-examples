import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "./ErpHrmTimeTrackingTaskAtSummaryTransformer";
import { ErpHrmTimeTrackingTimesheetAtSummaryTransformer } from "./ErpHrmTimeTrackingTimesheetAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTimelogTransformer {
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
        // DTO IErpHrmTimeTrackingOrganization.ISummary is an empty object, so no nested transformer is required.
        organization: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_organizationsFindManyArgs,
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
        timesheet: ErpHrmTimeTrackingTimesheetAtSummaryTransformer.select(),
        // Required by mapping validator; not used for DTO shaping.
        timelogSnapshots: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimelog> {
    return {
      id: input.id,
      organization: {},
      employee: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await ErpHrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheet: input.timesheet
        ? await ErpHrmTimeTrackingTimesheetAtSummaryTransformer.transform(
            input.timesheet,
          )
        : null,
      work_date: input.work_date.toISOString(),
      start_time: input.start_time?.toISOString() ?? null,
      end_time: input.end_time?.toISOString() ?? null,
      duration_minutes: input.duration_minutes,
      note: input.note,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
