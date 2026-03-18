import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        project: HrmPlatformProjectAtSummaryTransformer.select(),
        task: HrmPlatformTaskAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: true,
      },
    } satisfies Prisma.hrm_platform_timersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimer.ISummary> {
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
    };
  }
}
