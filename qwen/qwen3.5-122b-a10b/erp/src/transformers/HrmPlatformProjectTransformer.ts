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
          },
        },
        projectMemberships: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_project_membersFindManyArgs,
        tasks: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_project_snapshotsFindManyArgs,
        projectTimelogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        timers: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_timersFindManyArgs,
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
      description: input.description ?? null,
      color_code: input.color_code,
      status: input.status as "active" | "archived" | "completed",
      budget_hours: input.budget_hours ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
