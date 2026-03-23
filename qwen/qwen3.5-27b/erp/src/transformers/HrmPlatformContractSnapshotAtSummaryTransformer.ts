import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformContractSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_contract_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_at: true,
        end_at: true,
        pay_rate: true,
        pay_period: true,
        working_hours_per_week: true,
        created_at: true,
      },
    } satisfies Prisma.hrm_platform_contract_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformContractSnapshot.ISummary> {
    return {
      id: input.id,
      start_at: input.start_at.toISOString(),
      end_at: input.end_at?.toISOString() ?? null,
      pay_rate: input.pay_rate,
      pay_period: input.pay_period,
      working_hours_per_week: input.working_hours_per_week,
      created_at: input.created_at.toISOString(),
    };
  }
}
