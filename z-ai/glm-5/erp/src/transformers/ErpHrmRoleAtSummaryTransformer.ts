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
        is_builtin: true,
        created_at: true,
      },
    } satisfies Prisma.erp_hrm_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      isBuiltin: input.is_builtin,
      createdAt: input.created_at.toISOString(),
    };
  }
}
