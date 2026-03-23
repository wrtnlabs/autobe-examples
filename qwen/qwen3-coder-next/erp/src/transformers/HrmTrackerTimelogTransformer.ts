import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";
import { HrmTrackerProjectAtSummaryTransformer } from "./HrmTrackerProjectAtSummaryTransformer";
import { HrmTrackerTaskAtSummaryTransformer } from "./HrmTrackerTaskAtSummaryTransformer";

export namespace HrmTrackerTimelogTransformer {
  export type Payload = Prisma.hrm_tracker_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        date: true,
        duration_in_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        timesheets: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        employee: HrmTrackerEmployeeAtSummaryTransformer.select(),
        project: HrmTrackerProjectAtSummaryTransformer.select(),
        task: HrmTrackerTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_timelogsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTrackerTimelog> {
    return {
      id: input.id,
      organization_id: input.organization_id,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      employee_id: input.employee_id,
      project_id: input.project_id,
      task_id: input.task_id ?? undefined,
      date: input.date.toISOString(),
      duration_in_minutes: input.duration_in_minutes,
      description: input.description ?? undefined,
      billable: input.billable,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: await HrmTrackerEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTrackerProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await HrmTrackerTaskAtSummaryTransformer.transform(input.task)
        : undefined,
    };
  }
}
