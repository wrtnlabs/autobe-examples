import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_file } from "../prepare/prepare_random_discussion_board_article_file";

export async function generate_random_discussion_board_member_articles_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleFile.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleFile> {
  const prepared: IDiscussionBoardArticleFile.ICreate =
    prepare_random_discussion_board_article_file(props.body);
  const result: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
