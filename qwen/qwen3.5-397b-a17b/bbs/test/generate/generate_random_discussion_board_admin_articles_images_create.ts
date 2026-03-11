import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_image } from "../prepare/prepare_random_discussion_board_article_image";

export async function generate_random_discussion_board_admin_articles_images_create(
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
    await api.functional.discussionBoard.admin.articles.images.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
