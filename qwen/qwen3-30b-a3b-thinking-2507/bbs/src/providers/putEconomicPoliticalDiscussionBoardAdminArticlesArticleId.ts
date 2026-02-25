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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardArticleTransformer } from "../transformers/EconomicPoliticalDiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalDiscussionBoardArticle.IUpdate;
}): Promise<IEconomicPoliticalDiscussionBoardArticle> {
  await MyGlobal.prisma.economic_political_discussion_board_articles.findUniqueOrThrow(
    {
      where: { id: props.articleId },
    },
  );
  if (props.body.tags?.length) {
    await MyGlobal.prisma.economic_political_discussion_board_article_tags.deleteMany(
      {
        where: { article_id: props.articleId },
      },
    );
    for (const tag of props.body.tags) {
      const tagRecord =
        await MyGlobal.prisma.economic_political_discussion_board_tags.findFirst(
          {
            where: { name: tag },
          },
        );
      if (!tagRecord) {
        throw new HttpException(`Tag "${tag}" not found`, 404);
      }
      await MyGlobal.prisma.economic_political_discussion_board_article_tags.create(
        {
          data: {
            id: v4(),
            article_id: props.articleId,
            tag_id: tagRecord.id,
          },
        },
      );
    }
  }
  await MyGlobal.prisma.economic_political_discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title && { title: props.body.title }),
      ...(props.body.content && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  const article =
    await MyGlobal.prisma.economic_political_discussion_board_articles.findUniqueOrThrow(
      {
        where: { id: props.articleId },
        ...EconomicPoliticalDiscussionBoardArticleTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardArticleTransformer.transform(
    article,
  );
}
