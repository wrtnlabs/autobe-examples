import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardSectionAtSummaryTransformer } from "./EconomyPoliticsBoardSectionAtSummaryTransformer";
import { EconomyPoliticsBoardUserAtSummaryTransformer } from "./EconomyPoliticsBoardUserAtSummaryTransformer";

export namespace EconomyPoliticsBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.economy_politics_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        section: EconomyPoliticsBoardSectionAtSummaryTransformer.select(),
        author: EconomyPoliticsBoardUserAtSummaryTransformer.select(),
        _count: {
          economy_politics_board_article_comments: true,
        },
        content: true,
        updated_at: true,
        deleted_at: true,
        economy_politics_board_article_attachments: true,
        economy_politics_board_article_tags: true,
        economy_politics_board_search_results: true,
      },
    } satisfies Prisma.economy_politics_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author: await EconomyPoliticsBoardUserAtSummaryTransformer.transform(
        input.author,
      ),
      section: await EconomyPoliticsBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      comments_count: input._count.economy_politics_board_article_comments,
      created_at: input.created_at.toISOString(),
    };
  }
}
