import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { IHrmTimeTrackTimerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackProjectAtSummaryTransformer } from "./HrmTimeTrackProjectAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "./HrmTimeTrackTaskAtSummaryTransformer";
import { HrmTimeTrackTimerAtSummaryTransformer } from "./HrmTimeTrackTimerAtSummaryTransformer";

export namespace HrmTimeTrackTimerSnapshotTransformer {
  export type Payload = Prisma.hrm_time_track_timer_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        duration_seconds: true,
        started_at: true,
        stopped_at: true,
        note: true,
        created_at: true,
        timer: HrmTimeTrackTimerAtSummaryTransformer.select(),
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        project: HrmTimeTrackProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackTaskAtSummaryTransformer.select(),
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_timer_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTimerSnapshot> {
    return {
      id: input.id,
      event_type: input.event_type,
      duration_seconds: input.duration_seconds,
      started_at: input.started_at.toISOString(),
      stopped_at: input.stopped_at?.toISOString() ?? null,
      note: input.note ?? null,
      created_at: input.created_at.toISOString(),
      timer: await HrmTimeTrackTimerAtSummaryTransformer.transform(input.timer),
      employee: await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTimeTrackProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTimeTrackTaskAtSummaryTransformer.transform(input.task)
        : null,
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
