import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmContractAtSummaryTransformer } from "./ErpHrmContractAtSummaryTransformer";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmEmployeeTransformer {
  export type Payload = Prisma.erp_hrm_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
        contracts: ErpHrmContractAtSummaryTransformer.select(),
        projectMemberships: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_project_membersFindManyArgs,
        assignedTasks: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
        timelogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
        timesheets: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        reviewedTimesheets: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timesheetsFindManyArgs,
        timers: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_timersFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_employeesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmEmployee> {
    return {
      id: input.id,
      position: input.position ?? undefined,
      employment_type: input.employment_type,
      status: input.status,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : undefined,
      contracts: await ArrayUtil.asyncMap(
        input.contracts,
        ErpHrmContractAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
