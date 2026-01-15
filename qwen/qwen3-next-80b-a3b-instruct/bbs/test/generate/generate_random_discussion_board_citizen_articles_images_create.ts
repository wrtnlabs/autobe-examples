import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { prepare_random_discussion_board_article_image } from "../prepare/prepare_random_discussion_board_article_image";
export async function generate_random_discussion_board_citizen_articles_images_create(
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
  return await api.functional.discussionBoard.citizen.articles.images.create(
    connection,
    {
      body: prepared,
      articleId: props.params.articleId,
    },
  );
}
