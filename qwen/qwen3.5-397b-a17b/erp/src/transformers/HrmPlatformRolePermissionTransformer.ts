import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformRolePermissionTransformer {
  export type Payload = Prisma.hrm_platform_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: HrmPlatformRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformRolePermission> {
    return {
      id: input.id,
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      permission: input.permission,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
