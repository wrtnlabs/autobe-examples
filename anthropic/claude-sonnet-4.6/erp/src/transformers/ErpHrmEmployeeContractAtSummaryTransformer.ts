import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmEmployeeContractAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_employee_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        start_date: true,
        end_date: true,
        is_active: true,
        notes: true,
        created_at: true,
        updated_at: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_employee_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmEmployeeContract.ISummary> {
    return {
      id: input.id,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      pay_rate: input.pay_rate,
      pay_period: input.pay_period,
      working_hours_per_week: input.working_hours_per_week,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      is_active: input.is_active,
      notes: input.notes,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
