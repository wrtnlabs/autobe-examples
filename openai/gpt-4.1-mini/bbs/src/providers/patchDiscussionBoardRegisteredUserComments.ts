import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserComments(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 10;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_commentsWhereInput = {
    deleted_at: null,
    ...(props.body.discussionBoardArticleId && {
      discussion_board_article_id: props.body.discussionBoardArticleId,
    }),
    ...(props.body.discussionBoardRegisteredUserId && {
      discussion_board_registered_user_id:
        props.body.discussionBoardRegisteredUserId,
    }),
    ...(props.body.contentKeywords
      ? {
          content: {
            contains: props.body.contentKeywords,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.discussion_board_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_banned: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where,
  });
  return {
    data: data.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: toISOStringSafe(comment.created_at),
      updatedAt: toISOStringSafe(comment.updated_at),
      deletedAt: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
      author: {
        id: comment.author.id,
        email: comment.author.email,
        displayName: comment.author.display_name,
        bio: comment.author.bio ?? null,
        isBanned: comment.author.is_banned,
        createdAt: toISOStringSafe(comment.author.created_at),
        updatedAt: toISOStringSafe(comment.author.updated_at),
        deletedAt: comment.author.deleted_at
          ? toISOStringSafe(comment.author.deleted_at)
          : null,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
