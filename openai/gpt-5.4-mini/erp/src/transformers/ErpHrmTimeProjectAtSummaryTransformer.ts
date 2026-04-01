import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeProjectAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        projectMemberships: { select: { id: true } },
        tasks: { select: { id: true } },
        timelogs: { select: { id: true } },
        timers: { select: { id: true } },
        timeReportRows: { select: { id: true } },
        projectBudgetReportRows: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      colorCode: input.color_code,
      status: input.status,
      budgetHours: input.budget_hours,
      startDate: input.start_date?.toISOString() ?? null,
      endDate: input.end_date?.toISOString() ?? null,
      organization: {
        id: input.organization.id,
        name: input.organization.name,
      } satisfies IErpHrmTimeOrganization.ISummary,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
