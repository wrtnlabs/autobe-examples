import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeRoleChange";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerEmployeeAtSummaryTransformer } from "./HrmTrackerEmployeeAtSummaryTransformer";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";
import { HrmTrackerRoleAtSummaryTransformer } from "./HrmTrackerRoleAtSummaryTransformer";

export namespace HrmTrackerEmployeeRoleChangeAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_employee_role_changesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        changed_at: true,
        ip_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmTrackerEmployeeAtSummaryTransformer.select(),
        actor: HrmTrackerMemberAtSummaryTransformer.select(),
        oldRole: HrmTrackerRoleAtSummaryTransformer.select(),
        newRole: HrmTrackerRoleAtSummaryTransformer.select(),
        details: true,
      },
    } satisfies Prisma.hrm_tracker_employee_role_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerEmployeeRoleChange.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      changed_at: input.changed_at.toISOString(),
      ip_address: input.ip_address ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: await HrmTrackerEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      actor: await HrmTrackerMemberAtSummaryTransformer.transform(input.actor),
      oldRole: input.oldRole
        ? await HrmTrackerRoleAtSummaryTransformer.transform(input.oldRole)
        : null,
      newRole: await HrmTrackerRoleAtSummaryTransformer.transform(
        input.newRole,
      ),
    };
  }
}
