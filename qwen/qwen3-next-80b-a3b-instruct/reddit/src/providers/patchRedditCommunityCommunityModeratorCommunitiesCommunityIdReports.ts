import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorCommunitiesCommunityIdReports(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate that the communityModerator is authorized to view reports for this community
  const isModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.communityModerator.id,
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Base where clause with status filter and search
  const where: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    status: body.status ? body.status : undefined,
    OR: body.search
      ? [
          {
            reason: { contains: body.search, mode: "insensitive" },
          },
        ]
      : undefined,
  };
  // Join with posts and comments to filter by community_id
  const reportOfPostsWhere: Prisma.reddit_community_report_of_postsWhereInput =
    {
      post: {
        community_id: props.communityId,
      },
    };
  const reportOfCommentsWhere: Prisma.reddit_community_report_of_commentsWhereInput =
    {
      comment: {
        post: {
          community_id: props.communityId,
        },
      },
    };
  // Reports must target posts OR comments within this community
  where.OR = [
    { postReport: reportOfPostsWhere },
    { commentReport: reportOfCommentsWhere },
  ];
  // Define order by: newest (default) or oldest
  const orderBy: Prisma.reddit_community_reportsOrderByWithRelationInput =
    body.sort === "oldest" ? { created_at: "asc" } : { created_at: "desc" };
  // Fetch paginated data
  const data = await MyGlobal.prisma.reddit_community_reports.findMany({
    skip,
    take: limit,
    where,
    orderBy,
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where,
  });
  // Transform responses
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
