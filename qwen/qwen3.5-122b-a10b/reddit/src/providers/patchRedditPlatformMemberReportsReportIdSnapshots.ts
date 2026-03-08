import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
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

export async function patchRedditPlatformMemberReportsReportIdSnapshots(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReportSnapshot.IRequest;
}): Promise<IPageIRedditPlatformReportSnapshot> {
  // Find the report to determine which community it belongs to
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        post_id: true,
        comment_id: true,
      },
    });
  // Determine community_id from post or comment
  let communityId: string | null = null;
  if (report.post_id) {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.post_id },
      select: { community_id: true },
    });
    communityId = post?.community_id ?? null;
  } else if (report.comment_id) {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: report.comment_id },
      select: { reddit_platform_post_id: true },
    });
    if (comment?.reddit_platform_post_id) {
      const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
        where: { id: comment.reddit_platform_post_id },
        select: { community_id: true },
      });
      communityId = post?.community_id ?? null;
    }
  }
  if (!communityId) {
    throw new HttpException("Report not found or invalid", 404);
  }
  // Verify member is a moderator of the community
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: communityId,
        deleted_at: null,
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput: Prisma.reddit_platform_report_snapshotsWhereInput = {
    reddit_platform_report_id: props.reportId,
    ...(props.body.status && {
      status: props.body.status,
    }),
  };
  // Build orderBy
  const sortField = props.body.sort === "status" ? "status" : "created_at";
  const orderDirection = props.body.order === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.reddit_platform_report_snapshotsOrderByWithRelationInput =
    {
      [sortField]: orderDirection,
    };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.reddit_platform_report_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformReportSnapshotTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.reddit_platform_report_snapshots.count({
    where: whereInput,
  });
  // Transform
  const data = await Promise.all(
    snapshots.map((snapshot) =>
      RedditPlatformReportSnapshotTransformer.transform(snapshot),
    ),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformReportSnapshot;
}
