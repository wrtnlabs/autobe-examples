import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";

export namespace ErpHrmTimeProjectMembershipAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_project_membershipsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        project_role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_project_membershipsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeProjectMembership.ISummary> {
    return {
      id: input.id,
      projectRole: input.project_role,
      employee:
        await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
          input.employee,
        ),
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
