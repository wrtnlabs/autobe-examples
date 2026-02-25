import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  // Validate article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query comments with pagination and sorting
  const data = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: {
      article_id: props.articleId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_active: true,
          is_admin: true,
          is_super_admin: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      article_id: props.articleId,
      deleted_at: null,
    },
  });
  return {
    data: data.map((comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.content,
      created_at: comment.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: comment.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      author: {
        id: comment.author.id as string & tags.Format<"uuid">,
        email: comment.author.email as string & tags.Format<"email">,
        display_name: comment.author.display_name,
        bio: comment.author.bio ?? null,
        is_active: comment.author.is_active,
        is_admin: comment.author.is_admin,
        is_super_admin: comment.author.is_super_admin,
        created_at: comment.author.created_at.toISOString() as string &
          tags.Format<"date-time">,
        updated_at: comment.author.updated_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardMember.ISummary,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardComment.ISummary;
}
