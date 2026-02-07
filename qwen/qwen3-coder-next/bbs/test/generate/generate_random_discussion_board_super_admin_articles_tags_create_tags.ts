import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_tag } from "../prepare/prepare_random_discussion_board_article_tag";

export async function generate_random_discussion_board_super_admin_articles_tags_create_tags(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleTag.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleTag> {
  const prepared: IDiscussionBoardArticleTag.ICreate =
    prepare_random_discussion_board_article_tag(props.body);
  return await api.functional.discussionBoard.superAdmin.articles.tags.createTags(
    connection,
    {
      body: prepared,
      articleId: props.params.articleId,
    },
  );
}
