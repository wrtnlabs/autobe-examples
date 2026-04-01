import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimelogSnapshotTransformer } from "../transformers/ErpHrmTimeTrackingTimelogSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberTimelogSnapshotsTimelogSnapshotId(props: {
  member: MemberPayload;
  timelogSnapshotId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimelogSnapshot> {
  const snapshot =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelog_snapshots.findUnique({
      where: { id: props.timelogSnapshotId },
      include: {
        timelog: {
          select: { id: true },
        },
      },
    });
  if (snapshot === null) throw new HttpException("Not Found", 404);
  return await ErpHrmTimeTrackingTimelogSnapshotTransformer.transform(snapshot);
}
