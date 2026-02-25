import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_tag } from "../prepare/prepare_random_discussion_board_article_tag";

export async function generate_random_discussion_board_user_articles_tags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleTag.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticle> {
  const prepared: IDiscussionBoardArticleTag.ICreate =
    prepare_random_discussion_board_article_tag(props.body);
  const result: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.tags.create(connection, {
      articleId: props.params.articleId,
      body: prepared,
    });
  return result;
}
