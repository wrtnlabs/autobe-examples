import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardArticleSearchIndexAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_article_search_indexesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        discussion_board_article_id: true,
        created_at: true,
        updated_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_article_search_indexesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSearchIndex.ISummary> {
    return {
      id: input.id,
      title: input.title,
      body: input.body,
      articleId: input.discussion_board_article_id,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      tagMappingsCount: 0,
      deletedAt:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
    };
  }
}
