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
import { HrmTimeTrackRoleSnapshotTransformer } from "../transformers/HrmTimeTrackRoleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberRoleSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackRoleSnapshot> {
  const record =
    await MyGlobal.prisma.hrm_time_track_role_snapshots.findUniqueOrThrow({
      ...HrmTimeTrackRoleSnapshotTransformer.select(),
      where: { id: props.snapshotId },
    });
  return await HrmTimeTrackRoleSnapshotTransformer.transform(record);
}
