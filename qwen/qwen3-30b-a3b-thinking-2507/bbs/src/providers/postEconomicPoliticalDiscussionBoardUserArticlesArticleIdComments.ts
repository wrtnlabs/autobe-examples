import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardComment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardCommentCollector } from "../collectors/EconomicPoliticalDiscussionBoardCommentCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardCommentTransformer } from "../transformers/EconomicPoliticalDiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardUserArticlesArticleIdComments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalDiscussionBoardComment.ICreate;
}): Promise<IEconomicPoliticalDiscussionBoardComment> {
  const data = await EconomicPoliticalDiscussionBoardCommentCollector.collect({
    body: props.body,
    economicPoliticalDiscussionBoardArticles: { id: props.articleId },
    economicPoliticalDiscussionBoardUsers: { id: props.user.id },
  });
  const comment =
    await MyGlobal.prisma.economic_political_discussion_board_comments.create({
      data,
      ...EconomicPoliticalDiscussionBoardCommentTransformer.select(),
    });
  return await EconomicPoliticalDiscussionBoardCommentTransformer.transform(
    comment,
  );
}
