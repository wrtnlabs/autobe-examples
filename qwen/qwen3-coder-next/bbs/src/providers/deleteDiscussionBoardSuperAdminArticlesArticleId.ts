import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete related file attachments
    await tx.discussion_board_article_files.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
    // Delete related image attachments
    await tx.discussion_board_article_images.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
    // Delete related article tags
    await tx.discussion_board_article_tags.deleteMany({
      where: { bbs_article_id: props.articleId },
    });
    // Delete the article itself
    const deleted = await tx.discussion_board_articles.delete({
      where: { id: props.articleId },
    });
    if (!deleted) {
      throw new HttpException("Article not found", 404);
    }
  });
}
