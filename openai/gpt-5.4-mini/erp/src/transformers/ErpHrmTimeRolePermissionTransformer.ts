import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimePermissionAtSummaryTransformer } from "./ErpHrmTimePermissionAtSummaryTransformer";
import { ErpHrmTimeRoleAtSummaryTransformer } from "./ErpHrmTimeRoleAtSummaryTransformer";

export namespace ErpHrmTimeRolePermissionTransformer {
  export type Payload = Prisma.erp_hrm_time_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: ErpHrmTimeRoleAtSummaryTransformer.select(),
        permission: ErpHrmTimePermissionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeRolePermission> {
    return {
      id: input.id,
      role: await ErpHrmTimeRoleAtSummaryTransformer.transform(input.role),
      permission: await ErpHrmTimePermissionAtSummaryTransformer.transform(
        input.permission,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
