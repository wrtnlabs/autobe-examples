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

export async function putDiscussionBoardModeratorArticlesArticleIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const { moderator, articleId, commentId, body } = props;

  // Verify comment exists and belongs to the specified article
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: commentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (!existingComment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  // Update comment with new content
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      content: body.content ?? undefined,
      updated_at: now,
    },
  });

  // Create snapshot for audit trail
  await MyGlobal.prisma.discussion_board_comment_snapshots.create({
    data: {
      id: v4(),
      discussion_board_comment_id: commentId,
      content: updated.content,
      created_at: now,
    },
  });

  // Fetch author information based on author_type
  let memberAuthor: IDiscussionBoardMember.ISummary | null | undefined = null;
  let moderatorAuthor: IDiscussionBoardModerator.ISummary | null | undefined =
    null;

  if (
    updated.author_type === "member" &&
    updated.discussion_board_member_id !== null
  ) {
    const member = await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: updated.discussion_board_member_id },
    });
    if (member) {
      memberAuthor = {
        id: member.id,
        username: member.username,
        display_name: member.display_name,
        profile_picture_url: member.profile_picture_url,
      };
    }
  } else if (
    updated.author_type === "moderator" &&
    updated.discussion_board_moderator_id !== null
  ) {
    const mod = await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: { id: updated.discussion_board_moderator_id },
    });
    if (mod) {
      moderatorAuthor = {
        id: mod.id,
        username: mod.username,
        display_name: mod.display_name,
        profile_picture_url: mod.profile_picture_url,
        email_verified: mod.email_verified,
        status: mod.status,
        moderation_permissions: mod.moderation_permissions,
        profile_visibility: mod.profile_visibility,
        activity_visibility: mod.activity_visibility,
        bio: mod.bio,
        location: mod.location,
        website_url: mod.website_url,
        last_login_at: mod.last_login_at
          ? toISOStringSafe(mod.last_login_at)
          : null,
        created_at: toISOStringSafe(mod.created_at),
        updated_at: toISOStringSafe(mod.updated_at),
        deleted_at: mod.deleted_at ? toISOStringSafe(mod.deleted_at) : null,
      };
    }
  }

  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    discussion_board_parent_comment_id:
      updated.discussion_board_parent_comment_id
        ? updated.discussion_board_parent_comment_id
        : null,
    discussion_board_member_id: updated.discussion_board_member_id
      ? updated.discussion_board_member_id
      : null,
    discussion_board_moderator_id: updated.discussion_board_moderator_id
      ? updated.discussion_board_moderator_id
      : null,
    author_type: updated.author_type,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    memberAuthor,
    moderatorAuthor,
  };
}
