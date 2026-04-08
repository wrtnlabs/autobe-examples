import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleSnapshotPermissionTransformer } from "../transformers/HrmTimeTrackRoleSnapshotPermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberRoleSnapshotsSnapshotIdPermissionsPermissionId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackRoleSnapshotPermission> {
  const record =
    await MyGlobal.prisma.hrm_time_track_role_snapshot_permissions.findFirstOrThrow(
      {
        ...HrmTimeTrackRoleSnapshotPermissionTransformer.select(),
        where: {
          id: props.permissionId,
          hrm_time_track_role_snapshot_id: props.snapshotId,
        },
      },
    );
  return await HrmTimeTrackRoleSnapshotPermissionTransformer.transform(record);
}
