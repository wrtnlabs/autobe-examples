import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingTimelogSnapshotCollector } from "../collectors/ErpHrmTimeTrackingTimelogSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimelogSnapshotTransformer } from "../transformers/ErpHrmTimeTrackingTimelogSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberTimelogSnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimelogSnapshot.ICreate;
}): Promise<IErpHrmTimeTrackingTimelogSnapshot> {
  const startedAt = props.body.started_at;
  const endedAt = props.body.ended_at;
  if (endedAt < startedAt) {
    throw new HttpException(
      "ended_at must be greater than or equal to started_at",
      400,
    );
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const data = await ErpHrmTimeTrackingTimelogSnapshotCollector.collect({
      body: props.body,
    });
    return await prisma.erp_hrm_time_tracking_timelog_snapshots.create({
      data,
      ...ErpHrmTimeTrackingTimelogSnapshotTransformer.select(),
    });
  });
  return await ErpHrmTimeTrackingTimelogSnapshotTransformer.transform(created);
}
