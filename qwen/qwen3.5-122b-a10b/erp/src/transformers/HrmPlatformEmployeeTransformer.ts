import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformEmployeeTransformer {
  export type Payload = Prisma.hrm_platform_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: HrmPlatformMemberAtSummaryTransformer.select(),
        organization: {
          select: { id: true },
        } satisfies Prisma.hrm_platform_organizationsFindManyArgs,
        role: HrmPlatformRoleAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployee> {
    return {
      id: input.id,
      userId: input.user.id,
      organizationId: input.organization.id,
      roleId: input.role.id,
      departmentId: input.department?.id ?? null,
      position: input.position ?? undefined,
      employmentType: typia.assert<
        "full-time" | "part-time" | "contractor" | "intern"
      >(input.employment_type),
      status: typia.assert<"active" | "deactivated">(input.status),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      user: await HrmPlatformMemberAtSummaryTransformer.transform(input.user),
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
    };
  }
}
