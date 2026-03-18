import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingContractTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_employee_id: true,
        erp_hrm_time_tracking_organization_id: true,
        contract_number: true,
        contract_title: true,
        pay_amount: true,
        pay_currency: true,
        pay_frequency: true,
        work_term_start_date: true,
        work_term_end_date: true,
        notes: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingContract> {
    return {
      id: input.id,
      erpHrmTimeTrackingEmployeeId: input.erp_hrm_time_tracking_employee_id,
      erpHrmTimeTrackingOrganizationId:
        input.erp_hrm_time_tracking_organization_id,
      contractNumber: input.contract_number,
      contractTitle: input.contract_title,
      payAmount: input.pay_amount,
      payCurrency: input.pay_currency,
      payFrequency: input.pay_frequency,
      workTermStartDate: input.work_term_start_date.toISOString(),
      workTermEndDate: input.work_term_end_date?.toISOString() ?? null,
      notes: input.notes ?? null,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
