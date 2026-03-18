import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmContractAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        employment_type: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        start_date: true,
        end_date: true,
        notes: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        organization: true,
      },
    } satisfies Prisma.erp_hrm_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmContract.ISummary> {
    return {
      id: input.id,
      employmentType: input.employment_type,
      isActive: input.is_active,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date?.toISOString() ?? null,
      payRate: input.pay_rate,
      payPeriod: input.pay_period,
      workingHoursPerWeek: input.working_hours_per_week,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
