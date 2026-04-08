import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackProjectAtSummaryTransformer } from "./HrmTimeTrackProjectAtSummaryTransformer";

export namespace HrmTimeTrackTaskAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent_task_id: true,
        project: HrmTimeTrackProjectAtSummaryTransformer.select(),
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        parentTask: undefined,
      },
    } satisfies Prisma.hrm_time_track_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmTimeTrackTask.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmTimeTrackTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      priority: input.priority,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      project: await HrmTimeTrackProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee: input.employee
        ? await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
            input.employee,
          )
        : null,
      parentTask: input.parent_task_id
        ? await cache.get(input.parent_task_id)
        : null,
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmTimeTrackTask.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmTimeTrackTask.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_time_track_tasks.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
