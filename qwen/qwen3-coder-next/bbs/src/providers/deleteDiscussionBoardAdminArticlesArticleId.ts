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

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: { deleted_at: now },
  });
}
