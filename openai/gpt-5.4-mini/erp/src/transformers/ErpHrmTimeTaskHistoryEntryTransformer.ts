import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTaskAtSummaryTransformer } from "./ErpHrmTimeTaskAtSummaryTransformer";

export namespace ErpHrmTimeTaskHistoryEntryTransformer {
  export type Payload = Prisma.erp_hrm_time_task_history_entriesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTaskHistoryEntry> {
    return {
      id: input.id,
      task: await ErpHrmTimeTaskAtSummaryTransformer.transform(input.task),
      member: input.member as IErpHrmTimeMember.ISummary,
      oldStatus: input.old_status,
      newStatus: input.new_status,
      changedAt: input.changed_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        old_status: true,
        new_status: true,
        changed_at: true,
        task: ErpHrmTimeTaskAtSummaryTransformer.select(),
        member: true,
      },
    } satisfies Prisma.erp_hrm_time_task_history_entriesFindManyArgs;
  }
}
