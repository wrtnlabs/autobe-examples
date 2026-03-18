import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingOrganizationTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        currency_code: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Relations selected only for completeness; DTO ignores them
        departments: { select: { id: true } },
        contracts: { select: { id: true } },
        contractSnapshots: { select: { id: true } },
        projects: { select: { id: true } },
        timelogs: { select: { id: true } },
        timesheets: { select: { id: true } },
        timerSessions: { select: { id: true } },
        activityLogEntries: { select: { id: true } },
        activityLogEntrySnapshots: { select: { id: true } },
        reportDefinitions: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_tracking_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingOrganization> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logo_url: input.logo_url ?? null,
      currency_code: input.currency_code,
      timezone: input.timezone,
      fiscal_start_month: input.fiscal_start_month,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
