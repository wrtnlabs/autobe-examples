import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingContractSnapshotTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_contract_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_contract_id: true,
        employee_id: true,
        organization_id: true,
        contract_code: true,
        start_date: true,
        end_date: true,
        notes: true,
        hourly_rate: true,
        currency: true,
        work_term: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_contract_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingContractSnapshot> {
    return {
      id: input.id,
      erp_hrm_time_tracking_contract_id:
        input.erp_hrm_time_tracking_contract_id,
      employee_id: input.employee_id,
      organization_id: input.organization_id,
      contract_code: input.contract_code,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      notes: input.notes ?? null,
      hourly_rate: input.hourly_rate,
      currency: input.currency,
      work_term: input.work_term,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
