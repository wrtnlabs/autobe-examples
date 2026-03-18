import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmEmployeeContractTransformer {
  export type Payload = Prisma.erp_hrm_employee_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_member_id: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        start_date: true,
        end_date: true,
        is_active: true,
        notes: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.erp_hrm_employee_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmEmployeeContract> {
    return {
      id: input.id,
      organizationMemberId: input.organization_member_id,
      payRate: input.pay_rate,
      payPeriod: input.pay_period,
      workingHoursPerWeek: input.working_hours_per_week,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date?.toISOString() ?? null,
      isActive: input.is_active,
      notes: input.notes,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
