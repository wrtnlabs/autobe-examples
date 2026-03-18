import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmProjectTransformer {
  export type Payload = Prisma.erp_hrm_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        color_code: true,
        description: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        _count: {
          select: {
            projectMembers: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_projectsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmProject> {
    return {
      id: input.id,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      name: input.name,
      color_code: input.color_code ?? null,
      description: input.description ?? null,
      status: input.status as "active" | "archived" | "completed",
      budget_hours: input.budget_hours ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      projectMembers_count: input._count.projectMembers,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
