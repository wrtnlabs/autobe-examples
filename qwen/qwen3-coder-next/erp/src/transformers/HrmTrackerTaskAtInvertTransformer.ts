import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerProjectAtSummaryTransformer } from "./HrmTrackerProjectAtSummaryTransformer";

export namespace HrmTrackerTaskAtInvertTransformer {
  export type Payload = Prisma.hrm_tracker_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        estimated_hours: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        project: HrmTrackerProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerTask.IInvert> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      estimated_hours: input.estimated_hours ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      project: await HrmTrackerProjectAtSummaryTransformer.transform(
        input.project,
      ),
    };
  }
}
