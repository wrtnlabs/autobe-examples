import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdTagsTagId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the article to verify ownership
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { discussion_board_user_id: true },
    });
  // Check if the user is the author
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You are not the author of this article",
      403,
    );
  }
  // Find the user to check ban status
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { is_banned: true },
  });
  // Check if the user is banned
  if (user.is_banned) {
    throw new HttpException("Forbidden: User is banned", 403);
  }
  // Delete the tag association from the junction table
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: {
      discussion_board_article_id_discussion_board_tag_id: {
        discussion_board_article_id: props.articleId,
        discussion_board_tag_id: props.tagId,
      },
    },
  });
}
