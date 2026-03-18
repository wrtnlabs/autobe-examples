import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimelogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        duration_minutes: true,
        billable: true,
        description: true,
        start_time: true,
        end_time: true,
        created_at: true,
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
        timesheet: {
          select: {
            status: true,
          },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimelog.ISummary> {
    return {
      id: input.id,
      durationMinutes: input.duration_minutes,
      billable: input.billable,
      description: input.description ?? null,
      startTime: input.start_time.toISOString(),
      endTime: input.end_time?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheetStatus: input.timesheet?.status ?? null,
    };
  }
}
