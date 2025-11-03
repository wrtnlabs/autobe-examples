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

export async function putDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, commentId, body } = props;

  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: commentId },
    });

  if (comment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }

  if (comment.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own comments",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      content: body.content ?? undefined,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_comment_snapshots.create({
    data: {
      id: v4(),
      discussion_board_comment_id: commentId,
      content: updated.content,
      created_at: now,
    },
  });

  const result =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: commentId },
      include: {
        memberAuthor: true,
        moderatorAuthor: true,
      },
    });

  const memberAuthor: IDiscussionBoardMember.ISummary | null | undefined =
    result.memberAuthor
      ? {
          id: result.memberAuthor.id,
          username: result.memberAuthor.username,
          display_name: result.memberAuthor.display_name ?? undefined,
          profile_picture_url:
            result.memberAuthor.profile_picture_url ?? undefined,
        }
      : undefined;

  const moderatorAuthor: IDiscussionBoardModerator.ISummary | null | undefined =
    result.moderatorAuthor
      ? {
          id: result.moderatorAuthor.id,
          username: result.moderatorAuthor.username,
          display_name: result.moderatorAuthor.display_name,
          profile_picture_url: result.moderatorAuthor.profile_picture_url,
          email_verified: result.moderatorAuthor.email_verified,
          status: result.moderatorAuthor.status,
          moderation_permissions: result.moderatorAuthor.moderation_permissions,
          profile_visibility: result.moderatorAuthor.profile_visibility,
          activity_visibility: result.moderatorAuthor.activity_visibility,
          bio: result.moderatorAuthor.bio ?? undefined,
          location: result.moderatorAuthor.location ?? undefined,
          website_url: result.moderatorAuthor.website_url ?? undefined,
          last_login_at: result.moderatorAuthor.last_login_at
            ? toISOStringSafe(result.moderatorAuthor.last_login_at)
            : undefined,
          created_at: toISOStringSafe(result.moderatorAuthor.created_at),
          updated_at: toISOStringSafe(result.moderatorAuthor.updated_at),
          deleted_at: result.moderatorAuthor.deleted_at
            ? toISOStringSafe(result.moderatorAuthor.deleted_at)
            : undefined,
        }
      : undefined;

  return {
    id: result.id,
    discussion_board_article_id: result.discussion_board_article_id,
    discussion_board_parent_comment_id:
      result.discussion_board_parent_comment_id ?? undefined,
    discussion_board_member_id: result.discussion_board_member_id ?? undefined,
    discussion_board_moderator_id:
      result.discussion_board_moderator_id ?? undefined,
    author_type: result.author_type,
    content: result.content,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
    memberAuthor,
    moderatorAuthor,
  };
}
