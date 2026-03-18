import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        started_at: true,
        ended_at: true,
        created_at: true,
        members: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_project_membersFindManyArgs,
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
      budget_hours: input.budget_hours ?? null,
      started_at: input.started_at?.toISOString() ?? null,
      ended_at: input.ended_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      members_count: input.members.length,
    };
  }
}
