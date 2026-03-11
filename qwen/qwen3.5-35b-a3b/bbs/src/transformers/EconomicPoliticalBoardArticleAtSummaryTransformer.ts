import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";

export namespace EconomicPoliticalBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.economic_political_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        section: true,
        attachments: {
          select: { id: true },
        } satisfies Prisma.economic_political_board_attachmentsFindManyArgs,
        comments: {
          select: { deleted_at: true },
        } satisfies Prisma.economic_political_board_commentsFindManyArgs,
        articleTags: {
          select: { id: true },
        } satisfies Prisma.economic_political_board_article_tagsFindManyArgs,
      },
    } satisfies Prisma.economic_political_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      created_at: input.created_at.toISOString(),
      author:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          input.author,
        ),
      comment_count: input.comments.filter((c) => c.deleted_at === null).length,
    };
  }
}
