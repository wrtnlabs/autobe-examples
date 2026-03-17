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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberPostsPostIdCommentsCommentIdReplies(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // 1. Validate post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Validate parent comment exists on this post and is not deleted
  await MyGlobal.prisma.community_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 3. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build createdAt range filter (merged to avoid key collision)
  const createdAtFilter:
    | Prisma.DateTimeFilter<"community_comments">
    | undefined =
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtTo !== null
      ? {
          gte: new Date(props.body.createdAtFrom),
          lte: new Date(props.body.createdAtTo),
        }
      : props.body.createdAtFrom !== undefined &&
          props.body.createdAtFrom !== null
        ? { gte: new Date(props.body.createdAtFrom) }
        : props.body.createdAtTo !== undefined &&
            props.body.createdAtTo !== null
          ? { lte: new Date(props.body.createdAtTo) }
          : undefined;
  // 5. Build WHERE clause
  const whereInput = {
    parent_id: props.commentId,
    deleted_at: null,
    ...(props.body.keyword !== undefined &&
      props.body.keyword !== null && {
        content: { contains: props.body.keyword, mode: "insensitive" as const },
      }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.community_commentsWhereInput;
  // 6. Build ORDER BY — default for replies is newest-first (created_at DESC)
  const sort = props.body.sort ?? "new";
  const orderByInput = (
    sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.community_commentsOrderByWithRelationInput;
  // 7. Query replies with transformer select
  const data = await MyGlobal.prisma.community_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityCommentAtSummaryTransformer.select(),
  });
  // 8. Count total matching rows
  const total = await MyGlobal.prisma.community_comments.count({
    where: whereInput,
  });
  // 9. Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityCommentAtSummaryTransformer.transform,
  );
  // 10. Return paginated result
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
