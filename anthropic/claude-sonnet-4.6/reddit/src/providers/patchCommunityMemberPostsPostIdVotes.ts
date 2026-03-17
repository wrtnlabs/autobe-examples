import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostVoteAtSummaryTransformer } from "../transformers/CommunityPostVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPostVote.IRequest;
}): Promise<IPageICommunityPostVote.ISummary> {
  // Step 1: Validate that the post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Build WHERE clause
  const whereInput = {
    community_post_id: props.postId,
    ...(props.body.voteType != null && { vote_type: props.body.voteType }),
  } satisfies Prisma.community_post_votesWhereInput;
  // Step 4: Determine sort order
  const orderByInput = (
    props.body.sort === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.community_post_votesOrderByWithRelationInput;
  // Step 5: Query votes with transformer select
  const data = await MyGlobal.prisma.community_post_votes.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostVoteAtSummaryTransformer.select(),
  });
  // Step 6: Count total matching records
  const total = await MyGlobal.prisma.community_post_votes.count({
    where: whereInput,
  });
  // Step 7: Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPostVoteAtSummaryTransformer.transform,
  );
  // Step 8: Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
