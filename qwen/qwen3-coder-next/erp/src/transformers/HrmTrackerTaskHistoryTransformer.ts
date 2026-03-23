import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { IHrmTrackerTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";
import { HrmTrackerTaskAtSummaryTransformer } from "./HrmTrackerTaskAtSummaryTransformer";

export namespace HrmTrackerTaskHistoryTransformer {
  export type Payload = Prisma.hrm_tracker_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        old_status: true,
        new_status: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        task: HrmTrackerTaskAtSummaryTransformer.select(),
        employee: HrmTrackerEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerTaskHistory> {
    return {
      id: input.id,
      old_status: input.old_status,
      new_status: input.new_status,
      changed_at: input.changed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      task: await HrmTrackerTaskAtSummaryTransformer.transform(input.task),
      employee: await HrmTrackerEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    };
  }
}
