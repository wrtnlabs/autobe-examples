import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmRolePermissionTransformer {
  export type Payload = Prisma.erp_hrm_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role_id: true,
        permission: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: ErpHrmRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRolePermission> {
    return {
      id: input.id,
      roleId: input.role_id,
      permission: input.permission,
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
