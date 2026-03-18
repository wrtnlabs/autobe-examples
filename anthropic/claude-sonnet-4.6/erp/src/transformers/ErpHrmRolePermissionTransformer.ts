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
        permission_code: true,
        created_at: true,
        role: ErpHrmRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRolePermission> {
    return {
      id: input.id,
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      permission_code: input.permission_code,
      created_at: input.created_at.toISOString(),
    };
  }
}
