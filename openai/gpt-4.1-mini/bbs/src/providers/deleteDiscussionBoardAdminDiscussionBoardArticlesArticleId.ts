import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, articleId } = props;

  // Verify existence, throws if not found
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: articleId },
  });

  // Hard delete the article, cascade deletes attachments
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: articleId },
  });
}
