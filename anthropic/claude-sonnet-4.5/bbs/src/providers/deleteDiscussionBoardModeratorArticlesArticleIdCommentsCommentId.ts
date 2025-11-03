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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const { moderator, articleId, commentId } = props;

  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: commentId },
      include: {
        memberAuthor: true,
        moderatorAuthor: true,
      },
    });

  if (comment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }

  const nowIso = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: nowIso,
      updated_at: nowIso,
    },
  });

  let memberAuthor: IDiscussionBoardMember.ISummary | null | undefined = null;
  let moderatorAuthor: IDiscussionBoardModerator.ISummary | null | undefined =
    null;

  if (comment.author_type === "member" && comment.memberAuthor) {
    memberAuthor = {
      id: comment.memberAuthor.id satisfies string as string &
        tags.Format<"uuid">,
      username: comment.memberAuthor.username,
      display_name: comment.memberAuthor.display_name ?? null,
      profile_picture_url: comment.memberAuthor.profile_picture_url
        ? (comment.memberAuthor.profile_picture_url satisfies string as string &
            tags.Format<"uri">)
        : null,
    };
  } else if (comment.author_type === "moderator" && comment.moderatorAuthor) {
    moderatorAuthor = {
      id: comment.moderatorAuthor.id satisfies string as string &
        tags.Format<"uuid">,
      username: comment.moderatorAuthor.username,
      display_name: comment.moderatorAuthor.display_name,
      profile_picture_url: comment.moderatorAuthor.profile_picture_url
        ? (comment.moderatorAuthor
            .profile_picture_url satisfies string as string &
            tags.Format<"uri">)
        : null,
      email_verified: comment.moderatorAuthor.email_verified,
      status: comment.moderatorAuthor.status,
      moderation_permissions: comment.moderatorAuthor.moderation_permissions,
      profile_visibility: comment.moderatorAuthor.profile_visibility,
      activity_visibility: comment.moderatorAuthor.activity_visibility,
      bio: comment.moderatorAuthor.bio ?? null,
      location: comment.moderatorAuthor.location ?? null,
      website_url: comment.moderatorAuthor.website_url
        ? (comment.moderatorAuthor.website_url satisfies string as string &
            tags.Format<"uri">)
        : null,
      last_login_at: comment.moderatorAuthor.last_login_at
        ? toISOStringSafe(comment.moderatorAuthor.last_login_at)
        : null,
      created_at: toISOStringSafe(comment.moderatorAuthor.created_at),
      updated_at: toISOStringSafe(comment.moderatorAuthor.updated_at),
      deleted_at: comment.moderatorAuthor.deleted_at
        ? toISOStringSafe(comment.moderatorAuthor.deleted_at)
        : null,
    };
  }

  return {
    id: comment.id satisfies string as string & tags.Format<"uuid">,
    discussion_board_article_id:
      comment.discussion_board_article_id satisfies string as string &
        tags.Format<"uuid">,
    discussion_board_parent_comment_id:
      comment.discussion_board_parent_comment_id
        ? (comment.discussion_board_parent_comment_id satisfies string as string &
            tags.Format<"uuid">)
        : null,
    discussion_board_member_id: comment.discussion_board_member_id
      ? (comment.discussion_board_member_id satisfies string as string &
          tags.Format<"uuid">)
      : null,
    discussion_board_moderator_id: comment.discussion_board_moderator_id
      ? (comment.discussion_board_moderator_id satisfies string as string &
          tags.Format<"uuid">)
      : null,
    author_type: comment.author_type,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: nowIso,
    deleted_at: nowIso,
    memberAuthor,
    moderatorAuthor,
  };
}
