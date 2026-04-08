import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        description: true,
        color: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        projectMemberships: {
          select: {},
        } satisfies Prisma.hrm_platform_project_membersFindManyArgs,
        tasks: {
          select: {},
        } satisfies Prisma.hrm_platform_tasksFindManyArgs,
        timelogs: {
          select: {},
        } satisfies Prisma.hrm_platform_timelogsFindManyArgs,
        timers: {
          select: {},
        } satisfies Prisma.hrm_platform_timersFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      color: input.color,
      status: input.status as "active" | "archived" | "completed",
      budget_hours: input.budget_hours,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformProject.ISummary;
  }
}
