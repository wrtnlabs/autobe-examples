import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";

export namespace HrmTrackerEmployeeAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        employment_type: true,
        position: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        user: HrmTrackerMemberAtSummaryTransformer.select(),
        role: true,
        department: true,
        roleAssignments: true,
        roleChanges: true,
        histories: true,
        projectMembers: true,
        assignedTasks: true,
        taskHistories: true,
        timelogs: true,
        timesheets: true,
        contracts: true,
        activeTimers: true,
      },
    } satisfies Prisma.hrm_tracker_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerEmployee.ISummary> {
    return {
      id: input.id,
      status: input.status,
      position: input.position ?? null,
      created_at: input.created_at.toISOString(),
      user: await HrmTrackerMemberAtSummaryTransformer.transform(input.user),
    };
  }
}
