import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMembersMemberIdComments(props: {
  memberId: string;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const sort = props.body.sort ?? "best";
  const skip = (page - 1) * limit;
  const where = {
    community_member_id: props.memberId,
    is_deleted: false,
  } satisfies Prisma.community_commentsWhereInput;
  if (sort === "controversial") {
    // For controversial sort, fetch all and compute in-memory
    // (Prisma doesn't support computed fields in orderBy)
    const allComments = await MyGlobal.prisma.community_comments.findMany({
      where,
      ...CommunityCommentAtSummaryTransformer.select(),
    });
    // Compute controversy score and sort
    const sorted = allComments
      .map((comment) => ({
        comment,
        controversy:
          (comment.upvote_count + comment.downvote_count) /
          (Math.abs(comment.vote_score) + 1),
      }))
      .sort((a, b) => b.controversy - a.controversy);
    const total = sorted.length;
    const paginated = sorted.slice(skip, skip + limit);
    const data = await ArrayUtil.asyncMap(
      paginated.map((p) => p.comment),
      CommunityCommentAtSummaryTransformer.transform,
    );
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  // For 'best' and 'new' sorting, use Prisma orderBy directly
  const orderBy =
    sort === "new"
      ? [{ created_at: "desc" as const }]
      : [{ vote_score: "desc" as const }, { created_at: "desc" as const }];
  const comments = await MyGlobal.prisma.community_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...CommunityCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_comments.count({ where });
  const data = await ArrayUtil.asyncMap(
    comments,
    CommunityCommentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
