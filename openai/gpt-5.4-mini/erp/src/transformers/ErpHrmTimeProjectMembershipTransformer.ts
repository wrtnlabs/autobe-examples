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

export namespace ErpHrmTimeProjectMembershipTransformer {
  export type Payload = Prisma.erp_hrm_time_project_membershipsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_project_id: true,
        erp_hrm_time_employee_id: true,
        project_role: true,
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        employee:
          ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_project_membershipsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeProjectMembership> {
    return {
      id: input.id,
      erp_hrm_time_project_id: input.erp_hrm_time_project_id,
      erp_hrm_time_employee_id: input.erp_hrm_time_employee_id,
      project_role: input.project_role,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee:
        await ErpHrmTimeEmployeeDashboardSummaryAtSummaryTransformer.transform(
          input.employee,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
