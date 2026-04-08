import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_image_url: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ownerMember: {
          select: {
            id: true,
          },
        },
        organizationMemberships: { select: { id: true } },
        employees: { select: { id: true } },
        setting: { select: { id: true } },
        departments: { select: { id: true } },
        roles: { select: { id: true } },
        projects: { select: { id: true } },
        timeReportRows: { select: { id: true } },
        projectBudgetReportRows: { select: { id: true } },
        weeklySummaryReportRows: { select: { id: true } },
        organizationDashboardSummaries: { select: { id: true } },
        activityLogEntries: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeOrganizationDashboardSummary.ISummary> {
    return {
      id: input.id,
      ownerMember: {
        id: input.ownerMember.id,
      } satisfies IErpHrmTimeMember.ISummary,
      name: input.name,
      description: input.description,
      logoImageUrl: input.logo_image_url,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
