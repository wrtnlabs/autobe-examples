import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { IEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchResult";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardArticleAtSummaryTransformer } from "./EconomyPoliticsBoardArticleAtSummaryTransformer";
import { EconomyPoliticsBoardArticleTagAtSummaryTransformer } from "./EconomyPoliticsBoardArticleTagAtSummaryTransformer";

export namespace EconomyPoliticsBoardSearchResultTransformer {
  export type Payload = Prisma.economy_politics_board_search_resultsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: EconomyPoliticsBoardArticleAtSummaryTransformer.select(),
        tag: EconomyPoliticsBoardArticleTagAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economy_politics_board_search_resultsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardSearchResult> {
    return {
      id: input.id,
      article: await EconomyPoliticsBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      tag: await EconomyPoliticsBoardArticleTagAtSummaryTransformer.transform(
        input.tag,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
