import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
        description: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        rolePermissions: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      is_builtin: input.is_builtin,
      permissions_count: input.rolePermissions.length,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
