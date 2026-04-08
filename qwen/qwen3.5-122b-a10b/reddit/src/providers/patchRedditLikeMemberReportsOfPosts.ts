import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberReportsOfPosts(props: {
  member: MemberPayload;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Get communities where member is a moderator
  const moderatedCommunities =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: { reddit_like_member_id: props.member.id },
      select: { reddit_like_community_id: true },
    });
  const communityIds = moderatedCommunities.map((c) =>
    typia.assert<string & tags.Format<"uuid">>(c.reddit_like_community_id),
  );
  if (communityIds.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Get posts in moderated communities
  const postsInCommunities = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      reddit_like_community_id: { in: communityIds },
      deleted_at: null,
    },
    select: { id: true },
  });
  const postIds = postsInCommunities.map((p) =>
    typia.assert<string & tags.Format<"uuid">>(p.id),
  );
  if (postIds.length === 0) {
    const pagination: IPage.IPagination = {
      current: props.body.page ?? 1,
      limit: props.body.limit ?? 100,
      records: 0,
      pages: 0,
    };
    return {
      pagination,
      data: [],
    } satisfies IPageIRedditLikeReport.ISummary;
  }
  // Build where clause for reports - filter through postTarget relation (1:1, not 1:N)
  const whereInput: Prisma.reddit_like_reportsWhereInput = {
    actor_type: "post",
    deleted_at: null,
    postTarget: {
      reddit_like_post_id: { in: postIds },
    },
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.reddit_like_member_id !== undefined && {
      reddit_like_member_id: props.body.reddit_like_member_id,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        reason: { contains: props.body.search },
      }),
    ...(props.body.created_at_gte !== undefined && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte !== undefined && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereInput,
  });
  // Get paginated reports
  const reports = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditLikeReportAtSummaryTransformer.transform,
  );
  return {
    pagination,
    data,
  } satisfies IPageIRedditLikeReport.ISummary;
}
