import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeDepartmentHistory";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformEmployeeDepartmentHistoryTransformer {
  export type Payload =
    Prisma.hrm_platform_employee_department_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        changed_at: true,
        created_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        changedBy: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_employee_department_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployeeDepartmentHistory> {
    return {
      id: input.id,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      changedBy: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.changedBy,
      ),
      changed_at: input.changed_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
