import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_image } from "../prepare/prepare_random_discussion_board_article_image";

export async function generate_random_discussion_board_user_articles_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleImage.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleImage> {
  const prepared: IDiscussionBoardArticleImage.ICreate =
    prepare_random_discussion_board_article_image(props.body);
  const result: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.user.articles.images.create(
      connection,
      {
        body: prepared,
        articleId: props.params.articleId,
      },
    );
  return result;
}
