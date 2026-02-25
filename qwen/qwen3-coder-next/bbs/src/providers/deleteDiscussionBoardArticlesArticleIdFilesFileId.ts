import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardArticlesArticleIdFilesFileId(props: {
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { author_id: true },
    });
  const file =
    await MyGlobal.prisma.discussion_board_article_files.findUniqueOrThrow({
      where: { id: props.fileId, article_id: props.articleId },
    });
  if (article.author_id !== file.article_id) {
    // Admin authorization check would go here
  }
  await MyGlobal.prisma.discussion_board_article_files.delete({
    where: { id: props.fileId },
  });
}
