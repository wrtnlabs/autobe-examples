import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer } from "../transformers/ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberActivityLogEntrySnapshotsActivityLogEntrySnapshotId(props: {
  member: MemberPayload;
  activityLogEntrySnapshotId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot> {
  const memberSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: props.member.session_id },
        select: {
          id: true,
        },
      },
    );
  if (!memberSession) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.activityLogEntrySnapshotId,
        },
        ...ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer.transform(
    snapshot,
  );
}
