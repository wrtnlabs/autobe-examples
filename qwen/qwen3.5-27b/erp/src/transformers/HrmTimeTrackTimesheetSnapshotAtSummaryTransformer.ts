import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";

export namespace HrmTimeTrackTimesheetSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_timesheet_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        timesheet: { select: {} },
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_timesheet_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTimesheetSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.status,
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
