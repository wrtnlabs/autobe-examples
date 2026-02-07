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

export async function patchDiscussionBoardAdminArticlesArticleIdPin(props: {
  admin: AdminPayload;
  articleId: string;
}): Promise<void> {
  const { articleId } = props;
  // Verify article exists and retrieve current state
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Update pinned status to true (pin the article)
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: {
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
