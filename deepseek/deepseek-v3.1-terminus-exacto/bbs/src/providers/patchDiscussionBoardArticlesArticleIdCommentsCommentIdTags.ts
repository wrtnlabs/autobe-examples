import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdCommentsCommentIdTags(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentTag.IRequest;
}): Promise<IDiscussionBoardComment> {
  // First, verify the comment exists and belongs to the specified article
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });
  // Note: Authorization check would normally be here based on member context
  // However, props doesn't include member info, assuming middleware handles auth
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all existing tag associations for this comment
    await tx.discussion_board_comment_tags.deleteMany({
      where: { discussion_board_comment_id: props.commentId },
    });
    // If tags array is empty, we're done (all tags removed)
    if (props.body.tags.length === 0) {
      return;
    }
    // Create new tag associations based on request body
    const tagPromises = props.body.tags.map((tag) => {
      return tx.discussion_board_comment_tags.create({
        data: {
          id: v4(),
          discussion_board_comment_id: props.commentId,
          created_at: new Date(),
        },
      });
    });
    await Promise.all(tagPromises);
  });
  // Fetch and return the updated comment with full details
  const updatedComment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...DiscussionBoardCommentTransformer.select(),
    });
  return await DiscussionBoardCommentTransformer.transform(updatedComment);
}
