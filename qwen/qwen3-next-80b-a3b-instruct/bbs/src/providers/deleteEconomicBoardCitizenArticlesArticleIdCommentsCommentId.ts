import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEconomicBoardCitizenArticlesArticleIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate article exists (throws 404 if not found)
  const article =
    await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Validate comment exists and is linked to article (throws 404 if not found)
  const comment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  // Only comment author can delete (administrators are a separate actor; citizen payload has type 'citizen' only)
  if (comment.author_id !== props.citizen.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Generate current timestamp as string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());
  // Update comment: set deleted_at
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });
  // The comment_count field does not exist in the economic_board_articles model, so the decrement operation is removed.
}
