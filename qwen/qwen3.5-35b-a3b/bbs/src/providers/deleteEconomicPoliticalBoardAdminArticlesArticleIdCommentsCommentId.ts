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

export async function deleteEconomicPoliticalBoardAdminArticlesArticleIdCommentsCommentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify comment exists, belongs to article, and is not already deleted
  const comment =
    await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  // Admins have full deletion rights - no ownership check needed
  // Soft deletion: set deleted_at and updated_at timestamps using ISO string format
  await MyGlobal.prisma.economic_political_board_comments.update({
    where: {
      id: props.commentId,
      article_id: props.articleId,
    },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
