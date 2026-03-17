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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeOwnerReportsReportIdDismiss(props: {
  owner: OwnerPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  // Find the report with community info
  const report = await MyGlobal.prisma.reddit_like_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  // Get community to check ownership
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: report.community_id },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify the owner has moderation rights in this community
  // Owner must either be the community owner or a designated moderator
  const isCommunityOwner = community.owner_id === props.owner.id;
  if (!isCommunityOwner) {
    // Check if owner is a moderator of this community
    const moderatorRecord =
      await MyGlobal.prisma.reddit_like_moderators.findFirst({
        where: {
          member_id: props.owner.id,
          community_id: report.community_id,
          deleted_at: null,
        },
      });
    if (moderatorRecord === null) {
      throw new HttpException(
        "Forbidden - not authorized to dismiss reports in this community",
        403,
      );
    }
  }
  // Update report status to dismissed
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: new Date(),
    },
  });
  // Create audit snapshot recording the dismissal
  await MyGlobal.prisma.reddit_like_report_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_report_id: props.reportId,
      status: "dismissed",
      created_at: new Date(),
    },
  });
  // Return updated report using transformer
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
