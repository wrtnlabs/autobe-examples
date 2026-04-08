import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";
import { HrmTimeTrackProjectMemberAtSummaryTransformer } from "./HrmTimeTrackProjectMemberAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "./HrmTimeTrackTaskAtSummaryTransformer";

export namespace HrmTimeTrackProjectTransformer {
  export type Payload = Prisma.hrm_time_track_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
        projectMembers: HrmTimeTrackProjectMemberAtSummaryTransformer.select(),
        tasks: HrmTimeTrackTaskAtSummaryTransformer.select(),
        timelogs: true,
        timers: true,
        timerSnapshots: true,
        activityLogs: true,
      },
    } satisfies Prisma.hrm_time_track_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackProject> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      color_code: input.color_code,
      status: input.status,
      budget_hours: input.budget_hours ?? null,
      start_date: input.start_date ? toISOStringSafe(input.start_date) : null,
      end_date: input.end_date ? toISOStringSafe(input.end_date) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      projectMembers: await ArrayUtil.asyncMap(
        input.projectMembers,
        HrmTimeTrackProjectMemberAtSummaryTransformer.transform,
      ),
      tasks: await ArrayUtil.asyncMap(input.tasks, async (task) =>
        HrmTimeTrackTaskAtSummaryTransformer.transform(task),
      ),
    };
  }
}
