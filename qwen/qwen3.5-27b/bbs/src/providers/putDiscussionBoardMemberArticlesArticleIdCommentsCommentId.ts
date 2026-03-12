import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // Find the comment and verify it belongs to the specified article
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });
  // Verify authorization - member must own the comment
  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the comment
  await MyGlobal.prisma.discussion_board_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  // Return the updated comment
  const updated =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
      },
      ...DiscussionBoardCommentTransformer.select(),
    });
  return await DiscussionBoardCommentTransformer.transform(updated);
}
