import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardArticleViewAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        viewed_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleView.ISummary> {
    return {
      id: input.id,
      viewed_at: input.viewed_at.toISOString(),
      member: input.member
        ? await DiscussionBoardMemberAtSummaryTransformer.transform(
            input.member,
          )
        : null,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
    };
  }
}
