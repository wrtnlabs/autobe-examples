import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        created_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        task: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_tasksFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTaskHistory.ISummary> {
    return {
      id: input.id,
      previous_status: input.previous_status,
      new_status: input.new_status,
      created_at: input.created_at.toISOString(),
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
