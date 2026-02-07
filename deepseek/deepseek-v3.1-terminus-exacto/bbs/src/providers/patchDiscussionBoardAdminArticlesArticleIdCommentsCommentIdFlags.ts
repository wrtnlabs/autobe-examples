import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentFlagAtSummaryTransformer } from "../transformers/DiscussionBoardCommentFlagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdCommentsCommentIdFlags(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.IRequest;
}): Promise<IPageIDiscussionBoardCommentFlag.ISummary> {
  // Validate comment exists and belongs to article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { discussion_board_article_id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.discussion_board_article_id !== props.articleId)
    throw new HttpException(
      "Comment does not belong to specified article",
      400,
    );
  // Build WHERE clause for filtering
  const whereInput = {
    comment_id: props.commentId,
    ...(props.body.flag_type && { flag_type: props.body.flag_type }),
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.discussion_board_comment_flagsWhereInput;
  // Update flags with reviewer info and timestamp
  await MyGlobal.prisma.discussion_board_comment_flags.updateMany({
    where: whereInput,
    data: {
      reviewer_id: props.admin.id,
      reviewed_at: toISOStringSafe(new Date()),
    },
  });
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Retrieve updated flags with pagination
  const data = await MyGlobal.prisma.discussion_board_comment_flags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardCommentFlagAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_comment_flags.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardCommentFlagAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
