import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeRoleAtUpdatePermissionTransformer {
  export type Payload = {
    permissions: string[];
  };
  export function select() {
    return {
      select: {
        id: true,
      },
    } satisfies Prisma.erp_hrm_time_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeRole.IUpdatePermission> {
    return {
      permissions: input.permissions,
    };
  }
}
