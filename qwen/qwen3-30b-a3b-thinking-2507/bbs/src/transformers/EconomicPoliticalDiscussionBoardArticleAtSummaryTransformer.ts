import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_articlesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        section:
          EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.select(),
        comments: true,
      },
    } satisfies Prisma.economic_political_discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author:
        await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
          input.user,
        ),
      section:
        await EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.transform(
          input.section,
        ),
      comments_count: input.comments?.length || 0,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
