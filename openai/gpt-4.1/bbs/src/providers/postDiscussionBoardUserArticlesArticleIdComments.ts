import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserArticlesArticleIdComments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.ICreate;
}): Promise<IDiscussionBoardArticleComment> {
  // 1. Confirm the target article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or has been deleted", 404);
  }

  // 2. Load user record (not deleted, not locked)
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      is_locked: false,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User is blocked or deleted", 403);
  }

  // 3. Create the comment
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_article_comments.create({
      data: {
        id: v4(),
        discussion_board_article_id: props.articleId,
        author_user_id: props.user.id,
        body: props.body.body,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 4. Compose author summary
  const authorSummary = {
    id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url ?? undefined,
  };

  // 5. Return comment response in API format
  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    author: authorSummary,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
