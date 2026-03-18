import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingEmployeeContractAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_employee_contractsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_time_tracking_employee_contractsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeContract.ISummary> {
    return {
      id: input.id,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date?.toISOString() ?? null,
      pay_rate: input.pay_rate,
      pay_period: input.pay_period,
      working_hours_per_week: input.working_hours_per_week,
      notes: input.notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
