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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityPlatformAdminReportsReportIdAction(props: {
  platformAdmin: PlatformadminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IRedditCommunityCommentReport> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      select: {
        id: true,
        comment_id: true,
        reporter_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
        comment: { select: { id: true } },
        reporter: { select: { id: true } },
      },
    });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 400);
  }
  const action = typia.assert<"approve" | "dismiss">(props.body.status);
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    if (action === "approve") {
      // Insert moderation action
      await prisma.reddit_community_moderation_actions.create({
        data: {
          id: v4(),
          actor_id: props.platformAdmin.id,
          action_type: "delete",
          target_type: "comment",
          target_comment_id: report.comment_id,
          reason: report.reason,
          created_at: toISOStringSafe(new Date()),
        },
      });
      // Update report status to approved
      const updatedReport =
        await prisma.reddit_community_comment_reports.update({
          where: { id: props.reportId },
          data: {
            status: "approved",
            resolved_at: toISOStringSafe(new Date()),
          },
          ...RedditCommunityCommentReportTransformer.select(),
        });
      return await RedditCommunityCommentReportTransformer.transform(
        updatedReport,
      );
    } else {
      // Dismiss report
      const updatedReport =
        await prisma.reddit_community_comment_reports.update({
          where: { id: props.reportId },
          data: {
            status: "dismissed",
            resolved_at: toISOStringSafe(new Date()),
          },
          ...RedditCommunityCommentReportTransformer.select(),
        });
      return await RedditCommunityCommentReportTransformer.transform(
        updatedReport,
      );
    }
  });
}
