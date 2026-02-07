import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardUserSessionAtSummaryTransformer } from "./DiscussionBoardUserSessionAtSummaryTransformer";

export namespace DiscussionBoardArticleViewStatEventAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_article_view_stat_eventsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        view_duration_seconds: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        userSession: DiscussionBoardUserSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_view_stat_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleViewStatEvent.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      view_duration_seconds: input.view_duration_seconds ?? undefined,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      userSession: input.userSession
        ? await DiscussionBoardUserSessionAtSummaryTransformer.transform(
            input.userSession,
          )
        : null,
    };
  }
}
