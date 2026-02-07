import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_favorite } from "../prepare/prepare_random_discussion_board_article_favorite";

export async function generate_random_discussion_board_user_article_favorites_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleFavorite.ICreate>;
  },
): Promise<IDiscussionBoardArticleFavorite> {
  const prepared: IDiscussionBoardArticleFavorite.ICreate =
    prepare_random_discussion_board_article_favorite(props.body);
  const result: IDiscussionBoardArticleFavorite =
    await api.functional.discussionBoard.user.article_favorites.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
