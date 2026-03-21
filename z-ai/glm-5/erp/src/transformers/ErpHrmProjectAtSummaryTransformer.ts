import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmProjectAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_projectsGetPayload<
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
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      colorCode: input.color_code,
      status: input.status,
      budgetHours: input.budget_hours ?? null,
      startDate: input.start_date?.toISOString() ?? null,
      endDate: input.end_date?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
