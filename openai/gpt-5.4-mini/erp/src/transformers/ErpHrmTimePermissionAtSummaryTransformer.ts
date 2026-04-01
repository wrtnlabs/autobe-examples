import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimePermissionAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        rolePermissions: true,
      },
    } satisfies Prisma.erp_hrm_time_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimePermission.ISummary> {
    return {
      id: input.id,
      key: input.key,
      description: input.description,
    };
  }
}
