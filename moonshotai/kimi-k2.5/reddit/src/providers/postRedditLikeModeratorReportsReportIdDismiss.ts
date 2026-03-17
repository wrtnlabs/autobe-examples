import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  // Step 1: Find the report and verify it exists
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  // Step 2: Verify report is in pending status
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  // Step 3: Verify the caller is a moderator of the community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: report.community_id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException(
      "Forbidden - Not a moderator of this community",
      403,
    );
  }
  // Step 4: Update the report status to dismissed
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Step 5: Create a snapshot for audit trail
  await MyGlobal.prisma.reddit_like_report_snapshots.create({
    data: {
      id: v4(),
      reddit_like_report_id: props.reportId,
      status: "dismissed",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Step 6: Fetch the updated report with all relations and transform
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
