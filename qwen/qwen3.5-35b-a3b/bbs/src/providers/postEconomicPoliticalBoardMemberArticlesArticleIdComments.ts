import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalBoardCommentCollector } from "../collectors/EconomicPoliticalBoardCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardCommentTransformer } from "../transformers/EconomicPoliticalBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardComment.ICreate;
}): Promise<IEconomicPoliticalBoardComment> {
  // Validate article exists and is not soft-deleted
  await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Get author (member) record
  const memberRecord =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: props.member.id },
      },
    );
  // Get article record
  const articleRecord =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Collect and create comment
  const created =
    await MyGlobal.prisma.economic_political_board_comments.create({
      data: await EconomicPoliticalBoardCommentCollector.collect({
        body: props.body,
        economicPoliticalBoardAdministratorRoles: memberRecord,
        economicPoliticalBoardArticles: articleRecord,
      }),
      ...EconomicPoliticalBoardCommentTransformer.select(),
    });
  return await EconomicPoliticalBoardCommentTransformer.transform(created);
}
