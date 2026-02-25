import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardCommentTransformer } from "../transformers/EconomicBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicBoardAdministratorArticlesArticleIdCommentsCommentId(props: {
  administrator: AdministratorPayload;
  articleId: string;
  commentId: string;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  const comment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article_id: true,
        author_id: true,
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 404);
  }
  if (comment.article_id !== props.articleId) {
    throw new HttpException("Comment does not belong to this article", 403);
  }
  const created = new Date(comment.created_at);
  const now = new Date();
  const timeSinceCreated = now.getTime() - created.getTime();
  const sixtyMinutes = 60 * 60 * 1000;
  const isWithinEditWindow = timeSinceCreated <= sixtyMinutes;
  const isAuthor = comment.author_id === props.administrator.id;
  if (!isWithinEditWindow && !isAuthor) {
    throw new HttpException("Edit window expired", 403);
  }
  if (
    props.body.content.trim().length === 0 ||
    props.body.content.length > 1000
  ) {
    throw new HttpException("Content must be 1-1000 characters", 400);
  }
  const updated = await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content.trim(),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const result =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...EconomicBoardCommentTransformer.select(),
    });
  return await EconomicBoardCommentTransformer.transform(result);
}
