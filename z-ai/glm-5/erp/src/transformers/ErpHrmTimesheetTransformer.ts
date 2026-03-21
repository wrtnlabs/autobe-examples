import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "./ErpHrmTimelogAtSummaryTransformer";

export namespace ErpHrmTimesheetTransformer {
  export type Payload = Prisma.erp_hrm_timesheetsGetPayload<
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
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        reviewer: ErpHrmMemberAtSummaryTransformer.select(),
        timesheetTimelogs: {
          select: {
            timelog: ErpHrmTimelogAtSummaryTransformer.select(),
          },
        } satisfies Prisma.erp_hrm_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
    return {
      id: input.id,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewer: input.reviewer
        ? await ErpHrmMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status as IErpHrmTimesheet["status"],
      total_hours: input.total_hours,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      rejection_reason: input.rejection_reason,
      timelogs: await ArrayUtil.asyncMap(
        input.timesheetTimelogs,
        async (item) =>
          ErpHrmTimelogAtSummaryTransformer.transform(item.timelog),
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
