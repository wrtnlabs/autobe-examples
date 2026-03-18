import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportSnapshotTransformer } from "../transformers/CommunityPlatformReportSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminReportsReportIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportSnapshot> {
  const snapshotSelect = CommunityPlatformReportSnapshotTransformer.select();
  const snapshot =
    await MyGlobal.prisma.community_platform_report_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        community_platform_report_id: props.reportId,
        deleted_at: null,
      },
      select: snapshotSelect.select,
    });
  return await CommunityPlatformReportSnapshotTransformer.transform(snapshot);
}
