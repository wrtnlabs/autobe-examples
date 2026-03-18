import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformProjectAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        _count: { select: { projectMemberships: true } },
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      color_code: input.color_code,
      status: input.status,
      budget_hours: input.budget_hours ?? undefined,
      start_date: input.start_date?.toISOString() ?? undefined,
      end_date: input.end_date?.toISOString() ?? undefined,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      member_count: input._count.projectMemberships,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
