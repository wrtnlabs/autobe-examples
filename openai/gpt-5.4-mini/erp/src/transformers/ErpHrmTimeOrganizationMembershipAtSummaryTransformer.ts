import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";

export namespace ErpHrmTimeOrganizationMembershipAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_organization_membershipsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        is_selected_context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {},
        },
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_organization_membershipsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeOrganizationMembership.ISummary> {
    return {
      id: input.id,
      member: {},
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      status: input.status,
      isSelectedContext: input.is_selected_context,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
