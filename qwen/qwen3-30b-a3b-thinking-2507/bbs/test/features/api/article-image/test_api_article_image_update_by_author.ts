import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_images_post_by_articlecode } from "../../../generate/generate_random_discussion_board_member_articles_images_post_by_articlecode";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_image_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://${RandomGenerator.alphaNumeric(10)}.example.com/signup`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.example.com/login`,
      ip: "127.0.0.1",
    },
  });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 15,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  typia.assert(article);
  const image =
    await generate_random_discussion_board_member_articles_images_post_by_articlecode(
      memberConnection,
      {
        body: {
          filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
          mimetype: "image/jpeg",
          size: 1500000,
        } satisfies IDiscussionBoardArticleImage.ICreate,
        params: {
          articleCode: article.code,
        },
      },
    );
  typia.assert(image);
  const updatedImage =
    await api.functional.discussionBoard.member.articles.images.putByArticlecodeAndImagecode(
      memberConnection,
      {
        articleCode: article.code,
        imageCode: image.id,
        body: {
          is_primary: true,
          display_order: 1,
        } satisfies IDiscussionBoardArticleImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  TestValidator.equals(
    "is_primary should be true after update",
    updatedImage.is_primary,
    true,
  );
  TestValidator.equals(
    "display_order should be 1 after update",
    updatedImage.display_order,
    1,
  );
  TestValidator.equals(
    "article_id should match after image update",
    updatedImage.article.id,
    article.id,
  );
}
