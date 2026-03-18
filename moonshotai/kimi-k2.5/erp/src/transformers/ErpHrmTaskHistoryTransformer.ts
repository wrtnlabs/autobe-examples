import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTaskHistoryTransformer {
  export type Payload = Prisma.erp_hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        change_reason: true,
        created_at: true,
        task: ErpHrmTaskAtSummaryTransformer.select(),
        changedByMember: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTaskHistory> {
    return {
      id: input.id,
      previousStatus: input.previous_status,
      newStatus: input.new_status,
      changeReason: input.change_reason ?? null,
      createdAt: input.created_at.toISOString(),
      task: await ErpHrmTaskAtSummaryTransformer.transform(input.task),
      changedByMember: await ErpHrmMemberAtSummaryTransformer.transform(
        input.changedByMember,
      ),
    };
  }
}
