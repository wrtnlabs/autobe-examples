import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "./HrmPlatformTaskAtSummaryTransformer";

export namespace HrmPlatformTimerAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_timersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        started_at: true,
        stopped_at: true,
        description: true,
        created_at: true,
        updated_at: true,
        employee: true,
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        task: HrmPlatformTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_timersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimer.ISummary> {
    const now = new Date();
    const started = new Date(input.started_at);
    const stopped = input.stopped_at ? new Date(input.stopped_at) : null;
    return {
      id: input.id,
      started_at: input.started_at.toISOString(),
      stopped_at: input.stopped_at?.toISOString() ?? null,
      description: input.description ?? null,
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmPlatformTaskAtSummaryTransformer.transform(input.task)
        : null,
      status: input.stopped_at === null ? "active" : "completed",
      duration:
        input.stopped_at === null
          ? null
          : Math.round((stopped!.getTime() - started.getTime()) / 60000),
      elapsedTime:
        input.stopped_at === null
          ? Math.round((now.getTime() - started.getTime()) / 1000)
          : null,
    } satisfies IHrmPlatformTimer.ISummary;
  }
}
