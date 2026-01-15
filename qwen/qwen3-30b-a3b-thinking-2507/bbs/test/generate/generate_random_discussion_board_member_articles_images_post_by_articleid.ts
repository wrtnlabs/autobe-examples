import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article_image } from "../prepare/prepare_random_discussion_board_article_image";
export async function generate_random_discussion_board_member_articles_images_post_by_articleid(
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
    await api.functional.discussionBoard.member.articles.images.postByArticleid(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
