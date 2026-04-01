import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeProjectTransformer {
  export type Payload = Prisma.erp_hrm_time_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<IErpHrmTimeProject> {
    return {
      id: input.id,
      organization: input.organization as IErpHrmTimeOrganization.ISummary,
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
        organization: true,
        projectMemberships: true,
        tasks: true,
        timelogs: true,
        timers: true,
        timeReportRows: true,
        projectBudgetReportRows: true,
      },
    } satisfies Prisma.erp_hrm_time_projectsFindManyArgs;
  }
}
