import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRole";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeTransformer } from "./HrmTimeTrackingEmployeeTransformer";
import { HrmTimeTrackingRoleTransformer } from "./HrmTimeTrackingRoleTransformer";

export namespace HrmTimeTrackingEmployeeRoleTransformer {
  export type Payload = Prisma.hrm_time_tracking_employee_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_role_id: true,
        effective_from: true,
        effective_to: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmTimeTrackingEmployeeTransformer.select(),
        role: HrmTimeTrackingRoleTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_employee_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeRole> {
    return {
      id: input.id,
      hrm_time_tracking_employee_id: input.hrm_time_tracking_employee_id,
      hrm_time_tracking_role_id: input.hrm_time_tracking_role_id,
      effective_from: input.effective_from.toISOString(),
      effective_to: input.effective_to?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: await HrmTimeTrackingEmployeeTransformer.transform(
        input.employee,
      ),
      role: await HrmTimeTrackingRoleTransformer.transform(input.role),
    } satisfies IHrmTimeTrackingEmployeeRole;
  }
}
