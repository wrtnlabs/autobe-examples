import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "./HrmTimeTrackTaskAtSummaryTransformer";

export namespace HrmTimeTrackTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        created_at: true,
        task: HrmTimeTrackTaskAtSummaryTransformer.select(),
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTaskHistory.ISummary> {
    return {
      id: input.id,
      task: await HrmTimeTrackTaskAtSummaryTransformer.transform(input.task),
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      previous_status: input.previous_status,
      new_status: input.new_status,
      created_at: input.created_at.toISOString(),
    };
  }
}
