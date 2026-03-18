import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmTimesheetAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        week_start_date: true,
        week_end_date: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        owner: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        reviewer: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        timelogs: true,
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheet.ISummary> {
    return {
      id: input.id,
      status: input.status,
      week_start_date: toISOStringSafe(input.week_start_date),
      week_end_date: toISOStringSafe(input.week_end_date),
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
      rejection_reason: input.rejection_reason,
      total_hours: input.timelogs.reduce(
        (sum, t) => sum + ((t as any).duration ?? 0),
        0,
      ),
      owner: await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      reviewer: input.reviewer
        ? await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
