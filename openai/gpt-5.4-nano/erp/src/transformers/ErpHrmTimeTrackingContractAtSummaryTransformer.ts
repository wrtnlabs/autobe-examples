import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";

export namespace ErpHrmTimeTrackingContractAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        organization: true as any,
        snapshots: true as any,
      },
    } satisfies Prisma.erp_hrm_time_tracking_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingContract.ISummary> {
    return {
      id: input.id,
      contract_number: input.contract_number,
      contract_title: input.contract_title,
      pay_amount: input.pay_amount,
      pay_currency: input.pay_currency,
      pay_frequency: input.pay_frequency,
      work_term_start_date: input.work_term_start_date.toISOString(),
      work_term_end_date: input.work_term_end_date
        ? input.work_term_end_date.toISOString()
        : null,
      status: input.status,
      employee: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
