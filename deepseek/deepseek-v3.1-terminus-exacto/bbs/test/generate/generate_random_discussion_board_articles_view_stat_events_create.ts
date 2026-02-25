import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_view_stat_event } from "../prepare/prepare_random_discussion_board_article_view_stat_event";

export async function generate_random_discussion_board_articles_view_stat_events_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleViewStatEvent.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleViewStatEvent> {
  const prepared: IDiscussionBoardArticleViewStatEvent.ICreate =
    prepare_random_discussion_board_article_view_stat_event(props.body);
  const result: IDiscussionBoardArticleViewStatEvent =
    await api.functional.discussionBoard.articles.view_stat_events.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
