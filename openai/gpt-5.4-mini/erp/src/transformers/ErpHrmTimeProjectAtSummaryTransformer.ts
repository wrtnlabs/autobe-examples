import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";

export namespace ErpHrmTimeProjectAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
        name: true,
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        projectMemberships: { select: {} },
        tasks: { select: {} },
        timelogs: { select: {} },
        timers: { select: {} },
        timeReportRows: { select: {} },
        projectBudgetReportRows: { select: {} },
      },
    } satisfies Prisma.erp_hrm_time_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeProject.ISummary> {
    return {
      id: input.id,
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      name: input.name,
      description: input.description ?? null,
      colorCode: input.color_code,
      status: input.status,
      budgetHours: input.budget_hours ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      endDate: input.end_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
