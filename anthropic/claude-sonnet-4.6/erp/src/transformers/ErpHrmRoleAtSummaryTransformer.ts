import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmRoleAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        permissions: {
          select: {
            id: true,
            permission_code: true,
            created_at: true,
          },
        } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRole.ISummary> {
    const role: IErpHrmRole.ISummary = {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      permissions: [],
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
    role.permissions = input.permissions.map(
      (p) =>
        ({
          id: p.id,
          role: role,
          permission_code: p.permission_code,
          created_at: p.created_at.toISOString(),
        }) satisfies IErpHrmRolePermission,
    );
    return role;
  }
}
