import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackRoleSnapshotPermissionCollector {
  export async function collect(props: {
    body: IHrmTimeTrackRoleSnapshotPermission.ICreate;
    hrmTimeTrackRoleSnapshots: IEntity;
  }) {
    return {
      id: v4(),
      permission: props.body.permission,
      created_at: new Date(),
      roleSnapshot: { connect: { id: props.hrmTimeTrackRoleSnapshots.id } },
    } satisfies Prisma.hrm_time_track_role_snapshot_permissionsCreateInput;
  }
}
