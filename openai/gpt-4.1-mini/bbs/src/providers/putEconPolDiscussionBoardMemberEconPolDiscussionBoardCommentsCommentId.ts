import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardComment";
import { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconPolDiscussionBoardMemberEconPolDiscussionBoardCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardComment.IUpdate;
}): Promise<IEconPolDiscussionBoardComment> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!existing) {
    throw new HttpException("Comment not found", 404);
  }

  if (existing.econ_pol_discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated =
    await MyGlobal.prisma.econ_pol_discussion_board_comments.update({
      where: { id: props.commentId },
      data: {
        body: props.body.body,
        parentComment:
          props.body.parentCommentId === undefined
            ? existing.parent_comment_id
              ? { connect: { id: existing.parent_comment_id } }
              : undefined
            : props.body.parentCommentId
              ? { connect: { id: props.body.parentCommentId } }
              : { disconnect: true },
        updated_at: new Date(),
      },
    });

  // Fetch article
  const article =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: updated.econ_pol_discussion_board_article_id },
    });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Fetch article author
  const articleAuthor =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: article.econ_pol_discussion_board_member_id },
    });
  if (!articleAuthor) {
    throw new HttpException("Article author not found", 404);
  }

  // Fetch comment author
  const author =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: updated.econ_pol_discussion_board_member_id },
    });
  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  return {
    id: updated.id,
    article: {
      id: article.id,
      title: article.title,
      author: {
        id: articleAuthor.id,
        username: articleAuthor.username,
        displayName: articleAuthor.username,
        avatarUrl: (articleAuthor as any).avatar_url ?? undefined,
        memberSince: toISOStringSafe(articleAuthor.created_at),
      },
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    },
    author: {
      id: author.id,
      username: author.username,
      displayName: author.username,
      avatarUrl: (author as any).avatar_url ?? undefined,
      memberSince: toISOStringSafe(author.created_at),
    },
    parent_id: updated.parent_comment_id ?? undefined,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    children_count: 0,
  };
}
