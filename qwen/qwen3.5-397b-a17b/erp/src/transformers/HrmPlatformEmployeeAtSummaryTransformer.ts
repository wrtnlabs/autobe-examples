import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformEmployeeAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        position: true,
        employment_type: true,
        status: true,
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        role: HrmPlatformRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployee.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      position: input.position,
      employment_type: input.employment_type,
      status: input.status,
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
    };
  }
}
