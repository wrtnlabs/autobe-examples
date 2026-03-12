import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardTagAtSummaryTransformer } from "./DiscussionBoardTagAtSummaryTransformer";

export namespace DiscussionBoardArticleTagTransformer {
  export type Payload = Prisma.discussion_board_article_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        tag: DiscussionBoardTagAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleTag> {
    return {
      id: input.id,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      tag: await DiscussionBoardTagAtSummaryTransformer.transform(input.tag),
      created_at: input.created_at.toISOString(),
    };
  }
}
