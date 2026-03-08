import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportSnapshotTransformer } from "../transformers/RedditPlatformReportSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminReportsReportIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReportSnapshot> {
  // Verify snapshot exists and belongs to the specified report
  const snapshot =
    await MyGlobal.prisma.reddit_platform_report_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        reddit_platform_report_id: props.reportId,
      },
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Verify report exists
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
    select: { community_id: true },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // Fetch snapshot with all relationships
  const snapshotWithRelations =
    await MyGlobal.prisma.reddit_platform_report_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...RedditPlatformReportSnapshotTransformer.select(),
    });
  return await RedditPlatformReportSnapshotTransformer.transform(
    snapshotWithRelations,
  );
}
