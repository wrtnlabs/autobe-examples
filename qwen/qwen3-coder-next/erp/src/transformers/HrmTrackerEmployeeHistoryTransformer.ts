import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerEmployeeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeHistory";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerDepartmentAtSummaryTransformer } from "./HrmTrackerDepartmentAtSummaryTransformer";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";
import { HrmTrackerRoleAtSummaryTransformer } from "./HrmTrackerRoleAtSummaryTransformer";

export namespace HrmTrackerEmployeeHistoryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.hrm_tracker_employee_historiesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        previous_status: true,
        current_status: true,
        previous_position: true,
        current_position: true,
        previous_employment_type: true,
        current_employment_type: true,
        changed_fields: true,
        change_description: true,
        created_at: true,
        employee: HrmTrackerEmployeeAtSummaryTransformer.select(),
        changedBy: HrmTrackerMemberAtSummaryTransformer.select(),
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        role: HrmTrackerRoleAtSummaryTransformer.select(),
        department: HrmTrackerDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_employee_historiesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerEmployeeHistory> {
    return {
      id: input.id,
      action_type: input.action_type,
      previous_status: input.previous_status,
      current_status: input.current_status,
      previous_position: input.previous_position,
      current_position: input.current_position,
      previous_employment_type: input.previous_employment_type,
      current_employment_type: input.current_employment_type,
      changed_fields: input.changed_fields,
      change_description: input.change_description,
      created_at: input.created_at.toISOString(),
      employee: await HrmTrackerEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      changedBy: input.changedBy
        ? await HrmTrackerMemberAtSummaryTransformer.transform(input.changedBy)
        : null,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: input.role
        ? await HrmTrackerRoleAtSummaryTransformer.transform(input.role)
        : null,
      department: input.department
        ? await HrmTrackerDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
    };
  }
}
