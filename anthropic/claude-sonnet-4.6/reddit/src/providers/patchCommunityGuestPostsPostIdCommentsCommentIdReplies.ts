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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityGuestPostsPostIdCommentsCommentIdReplies(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // 1. Validate that the post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: { id: true },
  });
  // 2. Validate that the parent comment exists, belongs to the post, and is not deleted
  const parentComment =
    await MyGlobal.prisma.community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, post_id: true, deleted_at: true },
    });
  if (
    parentComment.post_id !== props.postId ||
    parentComment.deleted_at !== null
  ) {
    throw new HttpException("Comment not found", 404);
  }
  // 3. Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build ORDER BY based on sort mode (default for replies: newest first)
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.community_commentsOrderByWithRelationInput;
  // 5. Build WHERE clause
  const whereInput = {
    parent_id: props.commentId,
    deleted_at: null,
    ...(props.body.keyword != null && {
      content: { contains: props.body.keyword, mode: "insensitive" as const },
    }),
  } satisfies Prisma.community_commentsWhereInput;
  // 6. Query data and count sequentially
  const data = await MyGlobal.prisma.community_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_comments.count({
    where: whereInput,
  });
  // 7. Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityCommentAtSummaryTransformer.transform,
  );
  // 8. Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
