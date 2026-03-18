import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformPermissionAtSummaryTransformer } from "./HrmPlatformPermissionAtSummaryTransformer";

export namespace HrmPlatformRoleTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_organizationsFindManyArgs,
        employeeAssignments: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employeesFindManyArgs,
        employeeSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_employee_snapshotsFindManyArgs,
        permissions: {
          select: {
            permission: HrmPlatformPermissionAtSummaryTransformer.select(),
          },
        } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformRole> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      is_builtin: input.is_builtin,
      permissions: await ArrayUtil.asyncMap(input.permissions, (rp) =>
        HrmPlatformPermissionAtSummaryTransformer.transform(rp.permission),
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
