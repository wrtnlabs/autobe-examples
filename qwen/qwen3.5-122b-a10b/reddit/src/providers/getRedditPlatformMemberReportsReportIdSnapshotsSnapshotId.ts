import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportSnapshotTransformer } from "../transformers/RedditPlatformReportSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberReportsReportIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReportSnapshot> {
  // First, verify the snapshot exists and get the report's community for access check
  const snapshotWithReport =
    await MyGlobal.prisma.reddit_platform_report_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        report: {
          select: {
            post_id: true,
            comment_id: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_report_snapshotsFindUniqueArgs);
  // Get community_id through post (or comment's post)
  let communityId: string | null = null;
  if (snapshotWithReport.report.post_id) {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: snapshotWithReport.report.post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else if (snapshotWithReport.report.comment_id) {
    const comment =
      await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
        where: { id: snapshotWithReport.report.comment_id },
        select: { reddit_platform_post_id: true },
      });
    if (comment.reddit_platform_post_id) {
      const post =
        await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
          where: { id: comment.reddit_platform_post_id },
          select: { community_id: true },
        });
      communityId = post.community_id;
    }
  }
  if (!communityId) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the member is a moderator of the community
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_community_id: communityId,
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the full snapshot with all relations using the transformer
  const snapshot =
    await MyGlobal.prisma.reddit_platform_report_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...RedditPlatformReportSnapshotTransformer.select(),
    } satisfies Prisma.reddit_platform_report_snapshotsFindUniqueArgs);
  return await RedditPlatformReportSnapshotTransformer.transform(snapshot);
}
