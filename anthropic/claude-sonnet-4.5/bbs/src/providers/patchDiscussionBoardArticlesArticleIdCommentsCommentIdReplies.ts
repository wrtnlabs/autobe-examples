import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function patchDiscussionBoardArticlesArticleIdCommentsCommentIdReplies(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { articleId, commentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: {
        discussion_board_article_id: articleId,
        discussion_board_parent_comment_id: commentId,
        ...(body.author_type !== undefined && {
          author_type: body.author_type,
        }),
        ...(body.discussion_board_member_id !== undefined &&
          body.discussion_board_member_id !== null && {
            discussion_board_member_id: body.discussion_board_member_id,
          }),
        ...(body.discussion_board_moderator_id !== undefined &&
          body.discussion_board_moderator_id !== null && {
            discussion_board_moderator_id: body.discussion_board_moderator_id,
          }),
        ...(body.search !== undefined &&
          body.search.length > 0 && {
            content: { contains: body.search },
          }),
        ...((body.from_date !== undefined || body.to_date !== undefined) && {
          created_at: {
            ...(body.from_date !== undefined && { gte: body.from_date }),
            ...(body.to_date !== undefined && { lte: body.to_date }),
          },
        }),
        ...(body.include_deleted !== true && { deleted_at: null }),
      },
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "updated_at"
            ? { updated_at: sortOrder }
            : { created_at: sortOrder },
      skip,
      take: limit,
      include: {
        memberAuthor: true,
        moderatorAuthor: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: articleId,
        discussion_board_parent_comment_id: commentId,
        ...(body.author_type !== undefined && {
          author_type: body.author_type,
        }),
        ...(body.discussion_board_member_id !== undefined &&
          body.discussion_board_member_id !== null && {
            discussion_board_member_id: body.discussion_board_member_id,
          }),
        ...(body.discussion_board_moderator_id !== undefined &&
          body.discussion_board_moderator_id !== null && {
            discussion_board_moderator_id: body.discussion_board_moderator_id,
          }),
        ...(body.search !== undefined &&
          body.search.length > 0 && {
            content: { contains: body.search },
          }),
        ...((body.from_date !== undefined || body.to_date !== undefined) && {
          created_at: {
            ...(body.from_date !== undefined && { gte: body.from_date }),
            ...(body.to_date !== undefined && { lte: body.to_date }),
          },
        }),
        ...(body.include_deleted !== true && { deleted_at: null }),
      },
    }),
  ]);

  const data: IDiscussionBoardComment.ISummary[] = comments.map((comment) => {
    const memberSummary: IDiscussionBoardMember.ISummary | null =
      comment.memberAuthor
        ? {
            id: comment.memberAuthor.id,
            username: comment.memberAuthor.username,
            display_name: comment.memberAuthor.display_name ?? null,
            profile_picture_url:
              comment.memberAuthor.profile_picture_url ?? null,
          }
        : null;

    const moderatorSummary: IDiscussionBoardModerator.ISummary | null =
      comment.moderatorAuthor
        ? {
            id: comment.moderatorAuthor.id,
            username: comment.moderatorAuthor.username,
            display_name: comment.moderatorAuthor.display_name,
            profile_picture_url: comment.moderatorAuthor.profile_picture_url,
            email_verified: comment.moderatorAuthor.email_verified,
            status: comment.moderatorAuthor.status,
            moderation_permissions:
              comment.moderatorAuthor.moderation_permissions,
            profile_visibility: comment.moderatorAuthor.profile_visibility,
            activity_visibility: comment.moderatorAuthor.activity_visibility,
            bio: comment.moderatorAuthor.bio ?? null,
            location: comment.moderatorAuthor.location ?? null,
            website_url: comment.moderatorAuthor.website_url ?? null,
            last_login_at: comment.moderatorAuthor.last_login_at
              ? toISOStringSafe(comment.moderatorAuthor.last_login_at)
              : null,
            created_at: toISOStringSafe(comment.moderatorAuthor.created_at),
            updated_at: toISOStringSafe(comment.moderatorAuthor.updated_at),
            deleted_at: comment.moderatorAuthor.deleted_at
              ? toISOStringSafe(comment.moderatorAuthor.deleted_at)
              : null,
          }
        : null;

    return {
      id: comment.id,
      content: comment.content,
      author_type: comment.author_type,
      memberAuthor: memberSummary,
      moderatorAuthor: moderatorSummary,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
