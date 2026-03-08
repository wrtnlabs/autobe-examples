import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminArticlesArticleIdTagsTagId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists (admin can access any article)
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Find the junction record
  const record = await MyGlobal.prisma.discussion_board_article_tags.findFirst({
    where: {
      article_id: props.articleId,
    },
  });
  // If record exists, delete it
  if (record) {
    await MyGlobal.prisma.discussion_board_article_tags.delete({
      where: {
        id: record.id,
      },
    });
  }
}
