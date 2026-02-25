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
import { EconomicBoardCommentCollector } from "../collectors/EconomicBoardCommentCollector";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicBoardCommentTransformer } from "../transformers/EconomicBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardCitizenArticlesArticleIdComments(props: {
  citizen: CitizenPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicBoardComment.ICreate;
}): Promise<IEconomicBoardComment> {
  // Verify article exists and is not deleted
  const article =
    await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { is_deleted: true },
    });
  if (article.is_deleted !== false) {
    throw new HttpException("Article not found", 404);
  }
  // Use collector to prepare create data
  const createData = await EconomicBoardCommentCollector.collect({
    body: props.body,
    economicBoardArticles: { id: props.articleId } as IEntity,
    economicBoardCitizens: { id: props.citizen.id } as IEntity,
  });
  // Create comment
  const createdComment = await MyGlobal.prisma.economic_board_comments.create({
    data: createData,
    ...EconomicBoardCommentTransformer.select(),
  });
  // Return transformed response
  return await EconomicBoardCommentTransformer.transform(createdComment);
}
