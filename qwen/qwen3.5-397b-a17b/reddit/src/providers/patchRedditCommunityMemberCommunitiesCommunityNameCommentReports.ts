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

export async function patchRedditCommunityMemberCommunitiesCommunityNameCommentReports(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_member_id: true,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const isOwner = community.reddit_community_member_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      reddit_community_community_id: community.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const postIds = posts.map((p) => p.id);
  const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: {
      reddit_community_post_id: {
        in: postIds,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  const commentIds = comments.map((c) => c.id);
  const whereInput: Prisma.reddit_community_comment_reportsWhereInput = {
    deleted_at: null,
    reddit_community_comment_id: {
      in: commentIds,
    },
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.reddit_community_comment_reportsWhereInput;
  const orderByInput = props.body.sort
    ? props.body.sort.includes(":asc")
      ? { [props.body.sort.split(":")[0]]: "asc" as const }
      : { [props.body.sort.split(":")[0]]: "desc" as const }
    : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.reddit_community_comment_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityCommentReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_comment_reports.count({
    where: whereInput,
  });
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
