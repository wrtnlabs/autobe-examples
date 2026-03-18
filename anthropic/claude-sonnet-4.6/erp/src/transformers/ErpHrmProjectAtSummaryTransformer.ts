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
        color: true,
        status: true,
        budget_hours: true,
        started_at: true,
        ended_at: true,
        created_at: true,
        updated_at: true,
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
      color: input.color,
      status: input.status,
      budget_hours: input.budget_hours ?? null,
      started_at: input.started_at?.toISOString() ?? null,
      ended_at: input.ended_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
