import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_search_index } from "../prepare/prepare_random_discussion_board_article_search_index";

export async function generate_random_discussion_board_article_search_indexes_create_article_search_index(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleSearchIndex.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleSearchIndex> {
  const prepared: IDiscussionBoardArticleSearchIndex.ICreate =
    prepare_random_discussion_board_article_search_index(props.body);
  const result: IDiscussionBoardArticleSearchIndex =
    await api.functional.discussionBoard.article_search_indexes.createArticleSearchIndex(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
