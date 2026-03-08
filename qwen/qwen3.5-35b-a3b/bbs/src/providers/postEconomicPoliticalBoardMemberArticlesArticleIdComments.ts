import { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardCommentTransformer } from "../transformers/EconomicPoliticalBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardComment.ICreate;
}): Promise<IEconomicPoliticalBoardComment> {
  await MyGlobal.prisma.economic_political_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  const adminRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirstOrThrow(
      {
        where: {
          user_id: props.member.id,
        },
      },
    );
  const created =
    await MyGlobal.prisma.economic_political_board_comments.create({
      data: {
        id: props.member.id,
        author: {
          connect: {
            id: adminRole.id,
          },
        },
        article: {
          connect: {
            id: props.articleId,
          },
        },
        content: props.body.content,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      } satisfies Prisma.economic_political_board_commentsCreateInput,
      ...EconomicPoliticalBoardCommentTransformer.select(),
    });
  return await EconomicPoliticalBoardCommentTransformer.transform(created);
}
