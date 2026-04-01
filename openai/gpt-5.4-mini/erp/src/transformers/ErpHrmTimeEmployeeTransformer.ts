import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeDepartmentAtSummaryTransformer } from "./ErpHrmTimeDepartmentAtSummaryTransformer";
import { ErpHrmTimeRoleAtSummaryTransformer } from "./ErpHrmTimeRoleAtSummaryTransformer";

export namespace ErpHrmTimeEmployeeTransformer {
  export type Payload = Prisma.erp_hrm_time_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: {} },
        member: { select: {} },
        role: ErpHrmTimeRoleAtSummaryTransformer.select(),
        department: ErpHrmTimeDepartmentAtSummaryTransformer.select(),
        contracts: { select: {} },
        projectMemberships: { select: {} },
        assignedTasks: { select: {} },
        timers: { select: {} },
        timesheets: { select: {} },
        timeReportRows: { select: {} },
        dashboardSummary: { select: {} },
      },
    } satisfies Prisma.erp_hrm_time_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeEmployee> {
    return {
      id: input.id,
      organization: {} as IErpHrmTimeOrganization.ISummary,
      member: {} as IErpHrmTimeMember.ISummary,
      role: await ErpHrmTimeRoleAtSummaryTransformer.transform(input.role),
      department:
        input.department === null
          ? null
          : await ErpHrmTimeDepartmentAtSummaryTransformer.transform(
              input.department,
            ),
      positionTitle: input.position_title ?? null,
      employmentType: input.employment_type,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
