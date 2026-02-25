import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_image } from "../prepare/prepare_random_discussion_board_article_image";

export async function generate_random_discussion_board_registered_user_articles_images_create_image(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleImage.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardArticleImage> {
  const prepared: IDiscussionBoardArticleImage.ICreate =
    prepare_random_discussion_board_article_image(props.body);
  const result: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.registeredUser.articles.images.createImage(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
