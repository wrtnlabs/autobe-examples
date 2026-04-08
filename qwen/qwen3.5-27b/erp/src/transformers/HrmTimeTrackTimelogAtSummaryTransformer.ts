import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackProjectAtSummaryTransformer } from "./HrmTimeTrackProjectAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "./HrmTimeTrackTaskAtSummaryTransformer";

export namespace HrmTimeTrackTimelogAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        date: true,
        duration_seconds: true,
        billable: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        organization: true,
        project: HrmTimeTrackProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackTaskAtSummaryTransformer.select(),
        timesheets: {
          select: {
            timesheet: {
              select: {
                status: true,
              },
            },
          },
        } satisfies Prisma.hrm_time_track_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_track_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTimelog.ISummary> {
    return {
      id: input.id,
      date: input.date.toISOString(),
      duration_seconds: input.duration_seconds,
      billable: input.billable,
      notes: input.notes,
      timesheet_status: input.timesheets[0]?.timesheet?.status ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      project: await HrmTimeTrackProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTimeTrackTaskAtSummaryTransformer.transform(input.task)
        : null,
      employee: await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    };
  }
}
