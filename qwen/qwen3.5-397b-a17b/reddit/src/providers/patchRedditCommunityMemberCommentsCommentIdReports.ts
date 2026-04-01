import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentReportAtSummaryTransformer } from "../transformers/RedditCommunityCommentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommentsCommentIdReports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport.ISummary> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { reddit_community_post_id: true },
    });
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: comment.reddit_community_post_id },
    select: { reddit_community_community_id: true },
  });
  const communityId = post.reddit_community_community_id;
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: communityId,
        member_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: communityId },
      select: { reddit_community_member_id: true },
    });
  const isOwner = community.reddit_community_member_id === props.member.id;
  if (!moderator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_community_comment_id: props.commentId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.reddit_community_comment_reportsWhereInput;
  const sortField = props.body.sort?.split(":")[0] ?? "created_at";
  const sortDir = (props.body.sort?.split(":")[1] ?? "desc") as "asc" | "desc";
  const orderByInput = {
    [sortField]: sortDir,
  } satisfies Prisma.reddit_community_comment_reportsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityCommentReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_comment_reports.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommentReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
