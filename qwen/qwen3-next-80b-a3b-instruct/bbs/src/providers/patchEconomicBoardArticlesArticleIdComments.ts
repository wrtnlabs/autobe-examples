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
import { EconomicBoardCommentTransformer } from "../transformers/EconomicBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  // Validate article exists (prerequisite)
  await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Use transformer to get correct select structure for complete Prisma payload
  const selectOptions = EconomicBoardCommentTransformer.select();
  // Find comment with complete structure required by transformer
  const comment =
    await MyGlobal.prisma.economic_board_comments.findFirstOrThrow({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
      ...selectOptions,
    });
  // Use actor from props.customer as injected by AutoBE auth middleware
  const user = props.customer;
  if (!user) {
    throw new HttpException("Unauthorized", 401);
  }
  // Validate user is either author or administrator
  const isAuthor = comment.author.id === user.id;
  const isAdmin =
    user.role === "administrator" || user.role === "superAdministrator";
  // Calculate edit window: 60 minutes from creation
  const createdTime = comment.created_at.getTime();
  const editDeadline = createdTime + 60 * 60 * 1000;
  const currentTime = new Date().getTime();
  // Explicitly throw 403 if outside edit window and not admin
  if (!isAdmin && currentTime > editDeadline) {
    throw new HttpException("Comment edit window expired (60 minutes)", 403);
  }
  // Update content and set updated_at using current time as ISO string
  const updatedComment = await MyGlobal.prisma.economic_board_comments.update({
    where: { id: comment.id },
    data: {
      content: props.body.content,
      updated_at: new Date().toISOString(),
    },
  });
  // Re-fetch with transformer since update returns only modified fields
  const finalComment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: comment.id },
      ...selectOptions,
    });
  // Return transformed result using the transformer
  return await EconomicBoardCommentTransformer.transform(finalComment);
}
