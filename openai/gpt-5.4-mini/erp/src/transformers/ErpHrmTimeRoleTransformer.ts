import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimePermissionAtSummaryTransformer } from "./ErpHrmTimePermissionAtSummaryTransformer";

export namespace ErpHrmTimeRoleTransformer {
  export type Payload = Prisma.erp_hrm_time_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: { id: true },
        },
        rolePermissions: {
          select: {
            permission: ErpHrmTimePermissionAtSummaryTransformer.select(),
          },
        } satisfies Prisma.erp_hrm_time_role_permissionsFindManyArgs,
        employees: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_employeesFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_time_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimeRole> {
    return {
      id: input.id,
      organization: {
        id: input.organization.id,
      } as IErpHrmTimeOrganization.ISummary,
      name: input.name,
      description: input.description,
      isBuiltin: input.is_builtin,
      permissions: await ArrayUtil.asyncMap(input.rolePermissions, (item) =>
        ErpHrmTimePermissionAtSummaryTransformer.transform(item.permission),
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
