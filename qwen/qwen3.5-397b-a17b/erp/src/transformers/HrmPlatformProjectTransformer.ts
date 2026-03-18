import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformProjectTransformer {
  export type Payload = Prisma.hrm_platform_projectsGetPayload<
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
        started_at: true,
        ended_at: true,
        created_at: true,
        updated_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject> {
    return {
      id: input.id,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      name: input.name,
      description: input.description ?? undefined,
      color_code: input.color_code,
      status: input.status,
      budget_hours: input.budget_hours ?? undefined,
      started_at: input.started_at?.toISOString() ?? undefined,
      ended_at: input.ended_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
