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

export async function patchDiscussionBoardMembersMemberUsernameComments(props: {
  memberUsername: string;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { memberUsername, body } = props;

  if (!memberUsername || memberUsername.trim().length === 0) {
    throw new HttpException("Member username is required", 400);
  }

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      username: memberUsername,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const hasFromDate = body.from_date !== undefined && body.from_date !== null;
  const hasToDate = body.to_date !== undefined && body.to_date !== null;

  const where = {
    discussion_board_member_id: member.id,
    ...(body.discussion_board_article_id !== undefined &&
      body.discussion_board_article_id !== null && {
        discussion_board_article_id: body.discussion_board_article_id,
      }),
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
    ...((hasFromDate || hasToDate) && {
      created_at: {
        ...(hasFromDate && { gte: body.from_date }),
        ...(hasToDate && { lte: body.to_date }),
      },
    }),
    ...(body.include_deleted !== true && {
      deleted_at: null,
    }),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder === "asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
      include: {
        memberAuthor: true,
        moderatorAuthor: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  const data = comments.map((comment) => {
    const result = {
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.content,
      author_type: comment.author_type,
      memberAuthor: comment.memberAuthor
        ? {
            id: comment.memberAuthor.id as string & tags.Format<"uuid">,
            username: comment.memberAuthor.username,
            display_name: comment.memberAuthor.display_name ?? undefined,
            profile_picture_url: comment.memberAuthor.profile_picture_url
              ? (comment.memberAuthor.profile_picture_url as string &
                  tags.Format<"uri">)
              : undefined,
          }
        : null,
      moderatorAuthor: comment.moderatorAuthor
        ? {
            id: comment.moderatorAuthor.id as string & tags.Format<"uuid">,
            username: comment.moderatorAuthor.username,
            display_name: comment.moderatorAuthor.display_name,
            profile_picture_url: comment.moderatorAuthor.profile_picture_url
              ? (comment.moderatorAuthor.profile_picture_url as string &
                  tags.Format<"uri">)
              : null,
            email_verified: comment.moderatorAuthor.email_verified,
            status: comment.moderatorAuthor.status,
            moderation_permissions:
              comment.moderatorAuthor.moderation_permissions,
            profile_visibility: comment.moderatorAuthor.profile_visibility,
            activity_visibility: comment.moderatorAuthor.activity_visibility,
            bio: comment.moderatorAuthor.bio ?? undefined,
            location: comment.moderatorAuthor.location ?? undefined,
            website_url: comment.moderatorAuthor.website_url
              ? (comment.moderatorAuthor.website_url as string &
                  tags.Format<"uri">)
              : undefined,
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
    } satisfies IDiscussionBoardComment.ISummary;
    return result;
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
