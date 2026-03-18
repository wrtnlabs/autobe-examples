import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformEmployeeTransformer {
  export type Payload = Prisma.hrm_platform_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        role: HrmPlatformRoleAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        display_name: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployee> {
    return {
      id: input.id,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      display_name: input.display_name,
      position: input.position ?? null,
      employment_type: typia.assert<
        "full-time" | "part-time" | "contractor" | "intern"
      >(input.employment_type),
      status: typia.assert<"active" | "deactivated">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
