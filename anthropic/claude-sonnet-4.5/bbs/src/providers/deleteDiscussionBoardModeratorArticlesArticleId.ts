import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, articleId } = props;

  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: articleId },
  });

  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
