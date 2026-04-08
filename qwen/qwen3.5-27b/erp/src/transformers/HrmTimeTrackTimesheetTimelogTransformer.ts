import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { IHrmTimeTrackTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackTimelogTransformer } from "./HrmTimeTrackTimelogTransformer";
import { HrmTimeTrackTimesheetAtSummaryTransformer } from "./HrmTimeTrackTimesheetAtSummaryTransformer";

export namespace HrmTimeTrackTimesheetTimelogTransformer {
  export type Payload = Prisma.hrm_time_track_timesheet_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        timesheet: HrmTimeTrackTimesheetAtSummaryTransformer.select(),
        timelog: HrmTimeTrackTimelogTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_timesheet_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackTimesheetTimelog> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      timesheet: await HrmTimeTrackTimesheetAtSummaryTransformer.transform(
        input.timesheet,
      ),
      timelog: await HrmTimeTrackTimelogTransformer.transform(input.timelog),
    };
  }
}
