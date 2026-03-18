import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmRolePermissionTransformer } from "./ErpHrmRolePermissionTransformer";

export namespace ErpHrmRoleTransformer {
  export type Payload = Prisma.erp_hrm_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_organization_id: true,
        name: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        permissions: ErpHrmRolePermissionTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmRole> {
    return {
      id: input.id,
      organizationId: input.erp_hrm_organization_id,
      name: input.name,
      isBuiltin: input.is_builtin,
      permissions: await ArrayUtil.asyncMap(
        input.permissions,
        ErpHrmRolePermissionTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
