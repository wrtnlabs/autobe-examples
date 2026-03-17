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
  const whereInput: Prisma.reddit_community_votesWhereInput = {
    member_id: props.body.memberId,
    deleted_at: null,
    ...(props.body.postId !== null && { target_post_id: props.body.postId }),
    ...(props.body.commentId !== null && {
      target_comment_id: props.body.commentId,
    }),
    ...(props.body.voteType && { vote_type: props.body.voteType }),
    ...(props.body.startDate && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  } satisfies Prisma.reddit_community_votesWhereInput;
  // Build ORDER BY
  const orderByInput = (
    props.body.sortBy === "voteType"
      ? [{ vote_type: "asc" as const }]
      : props.body.sortBy === "directionImpact"
        ? [{ created_at: "asc" as const }] // directionImpact not available directly, use createdAt
        : [{ created_at: "desc" as const }]
  ) satisfies Prisma.reddit_community_votesOrderByWithRelationInput[];
  // Query votes with member join
  const data = await MyGlobal.prisma.reddit_community_votes.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    include: {
      member: {
        include: {
          karma: true,
        },
      },
    },
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_community_votes.count({
    where: whereInput,
  });
  // Transform
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityVoteAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
