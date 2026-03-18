import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformProjectTransformer {
  export type Payload = Prisma.hrm_platform_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_organizationsFindManyArgs,
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
        projectMemberships: true,
        tasks: true,
        snapshots: true,
        projectTimelogs: true,
        timers: true,
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject> {
    return {
      id: input.id,
      hrm_platform_organization_id: input.organization.id,
      name: input.name,
      description: input.description ?? undefined,
      color_code: input.color_code,
      status: typia.assert<"active" | "archived" | "completed">(input.status),
      budget_hours: input.budget_hours ?? undefined,
      start_date: input.start_date
        ? toISOStringSafe(input.start_date)
        : undefined,
      end_date: input.end_date ? toISOStringSafe(input.end_date) : undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
