import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityPlatformAdminCommunitiesCommunityIdReportsReportIdDismiss(props: {
  platformAdmin: PlatformadminPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  if (!report) throw new HttpException("Report not found", 404);
  if (report.status !== "pending")
    throw new HttpException(
      "Report is not pending and cannot be dismissed",
      400,
    );
  await MyGlobal.prisma.reddit_community_comment_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_at: toISOStringSafe(new Date()),
    },
  });
  const updatedReport =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      ...RedditCommunityCommentReportTransformer.select(),
    });
  if (!updatedReport) throw new HttpException("Updated report not found", 404);
  return await RedditCommunityCommentReportTransformer.transform(updatedReport);
}
