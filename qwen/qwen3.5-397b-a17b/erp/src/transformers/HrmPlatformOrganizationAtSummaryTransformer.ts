import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        departments: true,
        organizationMemberships: true,
        roles: true,
        employees: true,
        employeeInvitations: true,
        projects: true,
        activityLogs: true,
      },
    } satisfies Prisma.hrm_platform_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      logo_url: input.logo_url ?? undefined,
      currency: input.currency,
      timezone: input.timezone,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmPlatformOrganization.ISummary;
  }
}
