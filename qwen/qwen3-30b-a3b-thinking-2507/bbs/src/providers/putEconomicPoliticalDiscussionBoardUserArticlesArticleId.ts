import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardArticleTransformer } from "../transformers/EconomicPoliticalDiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalDiscussionBoardArticle.IUpdate;
}): Promise<IEconomicPoliticalDiscussionBoardArticle> {
  const article =
    await MyGlobal.prisma.economic_political_discussion_board_articles.findUniqueOrThrow(
      {
        where: { id: props.articleId },
        ...EconomicPoliticalDiscussionBoardArticleTransformer.select(),
      },
    );
  if (article.user.id !== props.user.id) {
    throw new HttpException("You can only update your own articles", 403);
  }
  if (
    props.body.title !== undefined &&
    (props.body.title.length < 5 || props.body.title.length > 100)
  ) {
    throw new HttpException("Title must be 5-100 characters", 400);
  }
  if (props.body.content !== undefined && props.body.content.length < 100) {
    throw new HttpException("Content must be at least 100 characters", 400);
  }
  await MyGlobal.prisma.economic_political_discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title !== undefined ? { title: props.body.title } : {}),
      ...(props.body.content !== undefined
        ? { content: props.body.content }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedArticle =
    await MyGlobal.prisma.economic_political_discussion_board_articles.findUniqueOrThrow(
      {
        where: { id: props.articleId },
        ...EconomicPoliticalDiscussionBoardArticleTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardArticleTransformer.transform(
    updatedArticle,
  );
}
