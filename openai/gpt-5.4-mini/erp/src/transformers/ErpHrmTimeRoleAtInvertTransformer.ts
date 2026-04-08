import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimePermissionAtSummaryTransformer } from "./ErpHrmTimePermissionAtSummaryTransformer";

export namespace ErpHrmTimeRoleAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_time_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeRole.IInvert> {
    return {
      id: input.id,
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      name: input.name,
      description: input.description,
      isBuiltin: input.is_builtin,
      permissions: await ArrayUtil.asyncMap(
        input.rolePermissions,
        async (item) =>
          ErpHrmTimePermissionAtSummaryTransformer.transform(item.permission),
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
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
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
        employees: { select: { id: true } },
        rolePermissions: {
          select: {
            permission: ErpHrmTimePermissionAtSummaryTransformer.select(),
          },
        } satisfies Prisma.erp_hrm_time_role_permissionsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_time_rolesFindManyArgs;
  }
}
