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

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { articleId, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const whereCondition = {
    discussion_board_article_id: articleId,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        content: {
          contains: body.search,
        },
      }),
    ...(body.author_type !== undefined &&
      body.author_type !== null && {
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
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
    ...(body.include_deleted !== true && {
      deleted_at: null,
    }),
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: whereCondition,
      include: {
        memberAuthor: true,
        moderatorAuthor: true,
      },
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder === "asc" ? "asc" : "desc" }
          : sortBy === "updated_at"
            ? { updated_at: sortOrder === "asc" ? "asc" : "desc" }
            : { created_at: sortOrder === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: whereCondition,
    }),
  ]);

  const data: IDiscussionBoardComment.ISummary[] = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    author_type: comment.author_type,
    memberAuthor: comment.memberAuthor
      ? {
          id: comment.memberAuthor.id,
          username: comment.memberAuthor.username,
          display_name: comment.memberAuthor.display_name ?? undefined,
          profile_picture_url:
            comment.memberAuthor.profile_picture_url ?? undefined,
        }
      : null,
    moderatorAuthor: comment.moderatorAuthor
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
          bio: comment.moderatorAuthor.bio ?? undefined,
          location: comment.moderatorAuthor.location ?? undefined,
          website_url: comment.moderatorAuthor.website_url ?? undefined,
          last_login_at: comment.moderatorAuthor.last_login_at
            ? toISOStringSafe(comment.moderatorAuthor.last_login_at)
            : undefined,
          created_at: toISOStringSafe(comment.moderatorAuthor.created_at),
          updated_at: toISOStringSafe(comment.moderatorAuthor.updated_at),
          deleted_at: comment.moderatorAuthor.deleted_at
            ? toISOStringSafe(comment.moderatorAuthor.deleted_at)
            : undefined,
        }
      : null,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
