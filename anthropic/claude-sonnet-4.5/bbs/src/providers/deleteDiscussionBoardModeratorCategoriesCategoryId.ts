import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorCategoriesCategoryId(props: {
  moderator: ModeratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: props.categoryId },
    });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_article_category_id: props.categoryId,
    },
  });

  if (articleCount > 0) {
    throw new HttpException(
      "Cannot delete category that is currently assigned to articles. Please recategorize all articles before deleting this category.",
      400,
    );
  }

  await MyGlobal.prisma.discussion_board_article_categories.delete({
    where: { id: props.categoryId },
  });
}
