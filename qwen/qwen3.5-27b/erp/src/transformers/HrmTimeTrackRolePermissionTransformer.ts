import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";

export namespace HrmTimeTrackRolePermissionTransformer {
  export type Payload = Prisma.hrm_time_track_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        permission: true,
        created_at: true,
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackRolePermission> {
    return {
      id: input.id,
      permission: input.permission,
      created_at: input.created_at.toISOString(),
      role: await HrmTimeTrackRoleAtSummaryTransformer.transform(input.role),
    };
  }
}
