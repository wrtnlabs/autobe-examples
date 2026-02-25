import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_file } from "../prepare/prepare_random_discussion_board_article_file";

/**
 * Generates a random discussion board article file attached to the article by ID.
 *
 * @param connection - API connection
 * @param props - Properties including optional body partial and required path params including articleId
 * @returns Created IDiscussionBoardArticleFile resource
 */
export async function generate_random_discussion_board_registered_user_articles_files_create_file(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleFile.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleFile> {
  const prepared: IDiscussionBoardArticleFile.ICreate =
    prepare_random_discussion_board_article_file(props.body);
  const result: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.registeredUser.articles.files.createFile(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
