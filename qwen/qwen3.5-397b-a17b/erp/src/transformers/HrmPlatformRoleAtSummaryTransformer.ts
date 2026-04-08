import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformRoleAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_built_in: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_organizationsFindManyArgs,
        rolePermissions: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs,
        employees: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employeesFindManyArgs,
        employeeInvitations: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employee_invitationsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      is_built_in: input.is_built_in,
      description: input.description ?? null,
      permission_count: input.rolePermissions.length,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmPlatformRole.ISummary;
  }
}
