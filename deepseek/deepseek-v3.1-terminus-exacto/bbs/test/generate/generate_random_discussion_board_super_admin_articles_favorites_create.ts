import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_favorite } from "../prepare/prepare_random_discussion_board_article_favorite";

export async function generate_random_discussion_board_super_admin_articles_favorites_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleFavorite.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleFavorite> {
  const prepared: IDiscussionBoardArticleFavorite.ICreate =
    prepare_random_discussion_board_article_favorite(props.body);
  const result: IDiscussionBoardArticleFavorite =
    await api.functional.discussionBoard.superAdmin.articles.favorites.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
