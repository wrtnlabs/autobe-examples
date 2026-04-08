import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackRoleSnapshotAtSummaryTransformer } from "./HrmTimeTrackRoleSnapshotAtSummaryTransformer";

export namespace HrmTimeTrackRoleSnapshotPermissionTransformer {
  export type Payload =
    Prisma.hrm_time_track_role_snapshot_permissionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        permission: true,
        created_at: true,
        roleSnapshot: HrmTimeTrackRoleSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_role_snapshot_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackRoleSnapshotPermission> {
    return {
      id: input.id,
      permission: input.permission,
      roleSnapshot:
        await HrmTimeTrackRoleSnapshotAtSummaryTransformer.transform(
          input.roleSnapshot,
        ),
      created_at: input.created_at.toISOString(),
    };
  }
}
