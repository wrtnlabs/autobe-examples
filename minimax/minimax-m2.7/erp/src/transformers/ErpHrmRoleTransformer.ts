import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmRolePermissionAtSummaryTransformer } from "./ErpHrmRolePermissionAtSummaryTransformer";

export namespace ErpHrmRoleTransformer {
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
        deleted_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        rolePermissions: ErpHrmRolePermissionAtSummaryTransformer.select(),
        _count: {
          select: {
            rolePermissions: true,
            employees: true,
            invitations: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmRole> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      rolePermissions: await ArrayUtil.asyncMap(
        input.rolePermissions,
        ErpHrmRolePermissionAtSummaryTransformer.transform,
      ),
      permissions_count: input._count.rolePermissions,
      employees_count: input._count.employees,
      invitations_count: input._count.invitations,
    };
  }
}
