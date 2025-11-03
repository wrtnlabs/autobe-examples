import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, body } = props;

  // Verify the article exists and is published
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
      status: "published",
    },
  });

  if (!article) {
    throw new HttpException("Article not found or not accessible", 404);
  }

  // If parent comment ID is provided, validate it exists and is top-level
  if (
    body.discussion_board_parent_comment_id !== undefined &&
    body.discussion_board_parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.discussion_board_comments.findFirst({
        where: {
          id: body.discussion_board_parent_comment_id,
          discussion_board_article_id: articleId,
          deleted_at: null,
        },
      });

    if (!parentComment) {
      throw new HttpException("Parent comment not found", 404);
    }

    // Enforce single-level threading: parent must be top-level
    if (parentComment.discussion_board_parent_comment_id !== null) {
      throw new HttpException(
        "Cannot reply to a reply - single-level threading only",
        400,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const commentId = v4();

  // Create the comment
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: commentId,
      discussion_board_article_id: articleId,
      discussion_board_parent_comment_id:
        body.discussion_board_parent_comment_id ?? null,
      discussion_board_member_id: member.id,
      discussion_board_moderator_id: null,
      author_type: "member",
      content: body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Fetch member author information for response
  const memberAuthor =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        profile_picture_url: true,
      },
    });

  return {
    id: created.id satisfies string as string & tags.Format<"uuid">,
    discussion_board_article_id:
      created.discussion_board_article_id satisfies string as string &
        tags.Format<"uuid">,
    discussion_board_parent_comment_id:
      created.discussion_board_parent_comment_id
        ? (created.discussion_board_parent_comment_id satisfies string as string &
            tags.Format<"uuid">)
        : undefined,
    discussion_board_member_id: created.discussion_board_member_id
      ? (created.discussion_board_member_id satisfies string as string &
          tags.Format<"uuid">)
      : undefined,
    discussion_board_moderator_id: undefined,
    author_type: created.author_type,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
    memberAuthor: {
      id: memberAuthor.id satisfies string as string & tags.Format<"uuid">,
      username: memberAuthor.username,
      display_name: memberAuthor.display_name ?? undefined,
      profile_picture_url: memberAuthor.profile_picture_url
        ? (memberAuthor.profile_picture_url satisfies string as string &
            tags.Format<"uri">)
        : undefined,
    },
    moderatorAuthor: undefined,
  };
}
