import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmContractTransformer {
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
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_contractsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmContract> {
    return {
      id: input.id,
      employmentType: input.employment_type,
      payRate: input.pay_rate,
      payPeriod: input.pay_period,
      workingHoursPerWeek: input.working_hours_per_week,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date?.toISOString() ?? null,
      notes: input.notes ?? null,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    };
  }
}
