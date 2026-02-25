import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardComment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer";
import { EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardCommentAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_commentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        article: {
          select: {
            id: true,
            title: true,
            created_at: true,
            user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
            section:
              EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.select(),
            comments: true,
          },
        },
      },
    } satisfies Prisma.economic_political_discussion_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      created_at: toISOStringSafe(input.created_at),
      author:
        await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
          input.user,
        ),
      article:
        await EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer.transform(
          input.article,
        ),
    };
  }
}
