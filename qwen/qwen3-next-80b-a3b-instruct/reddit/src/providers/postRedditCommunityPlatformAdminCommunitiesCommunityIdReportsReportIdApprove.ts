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

export async function postRedditCommunityPlatformAdminCommunitiesCommunityIdReportsReportIdApprove(props: {
  platformAdmin: PlatformadminPayload;
  communityId: string;
  reportId: string;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      include: {
        comment: { select: { comment_id: true } },
        reporter: { select: { id: true } },
      },
    });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.comment.comment_id !== props.communityId) {
    throw new HttpException("Report does not belong to this community", 403);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 403);
  }
  const updated = await MyGlobal.prisma.reddit_community_comment_reports.update(
    {
      where: { id: props.reportId },
      data: {
        status: "approved",
        resolved_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return RedditCommunityCommentReportTransformer.transform({
    ...updated,
    comment: { id: updated.comment_id },
    reporter: { id: updated.reporter_id },
  });
}
