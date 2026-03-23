import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerProjectAtSummaryTransformer } from "./HrmTrackerProjectAtSummaryTransformer";

export namespace HrmTrackerProjectMemberTransformer {
  export type Payload = Prisma.hrm_tracker_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        hrm_tracker_employee_id: true,
        hrm_tracker_project_id: true,
        role: true,
        created_at: true,
        updated_at: true,
        employee: HrmTrackerEmployeeAtSummaryTransformer.select(),
        project: HrmTrackerProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerProjectMember> {
    return {
      id: input.id,
      hrm_tracker_employee_id: input.hrm_tracker_employee_id,
      hrm_tracker_project_id: input.hrm_tracker_project_id,
      role: typia.assert<"member" | "project-lead">(input.role),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      employee: await HrmTrackerEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmTrackerProjectAtSummaryTransformer.transform(
        input.project,
      ),
    };
  }
}
