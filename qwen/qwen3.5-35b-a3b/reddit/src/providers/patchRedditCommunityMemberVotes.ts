import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityVoteAtSummaryTransformer } from "../transformers/RedditCommunityVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberVotes(props: {
  member: MemberPayload;
  body: IRedditCommunityVote.IRequest;
}): Promise<IPageIRedditCommunityVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const whereConditions: Prisma.reddit_community_votesWhereInput = {
    deleted_at: null,
  };
  // Add filters conditionally
  if (props.body.memberId !== undefined) {
    whereConditions.member_id = props.body.memberId;
  }
  if (props.body.postId !== null) {
    whereConditions.target_post_id = props.body.postId;
  }
  if (props.body.commentId !== null) {
    whereConditions.target_comment_id = props.body.commentId;
  }
  if (props.body.voteType !== undefined) {
    whereConditions.vote_type = props.body.voteType;
  }
  // Add date range filters - use DateTimeFilter for WHERE clauses, not DateTimeFieldUpdateOperationsInput
  const dateCondition: Prisma.DateTimeFilter<"reddit_community_votes"> = {};
  if (props.body.startDate !== undefined) {
    dateCondition.gte = props.body.startDate as unknown as Date;
  }
  if (props.body.endDate !== undefined) {
    dateCondition.lte = props.body.endDate as unknown as Date;
  }
  if (dateCondition.gte || dateCondition.lte) {
    whereConditions.created_at = dateCondition;
  }
  // Build order by clause
  let orderByCondition: Prisma.reddit_community_votesOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  if (props.body.sortBy === "createdAt") {
    orderByCondition = { created_at: "desc" };
  } else if (props.body.sortBy === "voteType") {
    orderByCondition = { vote_type: "asc" };
  } else if (props.body.sortBy === "directionImpact") {
    // directionImpact requires custom calculation - use vote_type as proxy
    orderByCondition = { vote_type: "asc", created_at: "desc" };
  }
  // Query votes
  const votes = await MyGlobal.prisma.reddit_community_votes.findMany({
    where: whereConditions as Prisma.reddit_community_votesWhereInput,
    skip,
    take: limit,
    orderBy: orderByCondition,
    ...RedditCommunityVoteAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_votes.count({
    where: whereConditions as Prisma.reddit_community_votesWhereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    votes,
    RedditCommunityVoteAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityVote.ISummary;
}
