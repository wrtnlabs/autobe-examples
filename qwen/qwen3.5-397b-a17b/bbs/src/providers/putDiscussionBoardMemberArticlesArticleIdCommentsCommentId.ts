import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
        deleted_at: true,
        member: {
          select: {
            adminProfile: true,
          },
        },
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 400);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  const isAdmin = comment.member.adminProfile !== null;
  const isOwner = comment.discussion_board_member_id === props.member.id;
  if (!isAdmin && !isOwner) {
    throw new HttpException(
      "Forbidden: Not comment owner or administrator",
      403,
    );
  }
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined &&
        props.body.content !== null && {
          content: props.body.content,
        }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...DiscussionBoardCommentTransformer.select(),
    });
  return await DiscussionBoardCommentTransformer.transform(updated);
}
