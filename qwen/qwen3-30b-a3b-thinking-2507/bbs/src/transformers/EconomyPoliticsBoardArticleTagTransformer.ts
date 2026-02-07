import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardArticleAtSummaryTransformer } from "./EconomyPoliticsBoardArticleAtSummaryTransformer";

export namespace EconomyPoliticsBoardArticleTagTransformer {
  export type Payload = Prisma.economy_politics_board_article_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tag: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: EconomyPoliticsBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economy_politics_board_article_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardArticleTag> {
    return {
      id: input.id,
      tag: input.tag,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      article: await EconomyPoliticsBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
    };
  }
}
