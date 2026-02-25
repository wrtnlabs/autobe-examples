import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_file } from "../prepare/prepare_random_discussion_board_article_file";

export async function generate_random_discussion_board_articles_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleFile.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleFile.ISummary> {
  const prepared: IDiscussionBoardArticleFile.ICreate =
    prepare_random_discussion_board_article_file(props.body);
  return await api.functional.discussionBoard.articles.files.create(
    connection,
    {
      body: prepared,
      articleId: props.params.articleId,
    },
  );
}
