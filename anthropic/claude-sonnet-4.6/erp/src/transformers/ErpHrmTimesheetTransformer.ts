import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "./ErpHrmTimelogAtSummaryTransformer";

export namespace ErpHrmTimesheetTransformer {
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
        timelogs: ErpHrmTimelogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
    const [owner, reviewer, timelogs] = await Promise.all([
      ErpHrmOrganizationMemberAtSummaryTransformer.transform(input.owner),
      input.reviewer
        ? ErpHrmOrganizationMemberAtSummaryTransformer.transform(input.reviewer)
        : Promise.resolve(null),
      ArrayUtil.asyncMap(
        input.timelogs,
        ErpHrmTimelogAtSummaryTransformer.transform,
      ),
    ]);
    return {
      id: input.id,
      owner,
      reviewer,
      status: input.status,
      weekStartDate: input.week_start_date.toISOString(),
      weekEndDate: input.week_end_date.toISOString(),
      submittedAt: input.submitted_at?.toISOString() ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      rejectionReason: input.rejection_reason,
      totalMinutes: input.timelogs.reduce(
        (sum, t) => sum + t.duration_minutes,
        0,
      ),
      timelogs,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
