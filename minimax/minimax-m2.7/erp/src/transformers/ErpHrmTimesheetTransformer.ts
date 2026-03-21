import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmTimesheetTimelogAtInvertTransformer } from "./ErpHrmTimesheetTimelogAtInvertTransformer";

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
        reviewerEmployee: ErpHrmEmployeeAtSummaryTransformer.select(),
        timesheetTimelogs: ErpHrmTimesheetTimelogAtInvertTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
    return {
      id: input.id,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      status: input.status,
      total_hours: input.total_hours,
      submitted_at:
        input.submitted_at !== null && input.submitted_at !== undefined
          ? toISOStringSafe(input.submitted_at)
          : null,
      reviewed_at:
        input.reviewed_at !== null && input.reviewed_at !== undefined
          ? toISOStringSafe(input.reviewed_at)
          : null,
      rejection_reason: input.rejection_reason ?? "",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewerEmployee: input.reviewerEmployee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(
            input.reviewerEmployee,
          )
        : null,
      timesheetTimelogs: await ArrayUtil.asyncMap(
        input.timesheetTimelogs,
        ErpHrmTimesheetTimelogAtInvertTransformer.transform,
      ),
    };
  }
}
