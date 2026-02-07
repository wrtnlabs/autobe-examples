import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_not_found_or_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create first article with image
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const image1 =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: { articleId: article1.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image1);
  // Create second article with image
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  const image2 =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: { articleId: article2.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image2);
  // Test 1: Non-existent image ID with valid article ID
  await TestValidator.error("non-existent image ID", async () => {
    await api.functional.discussionBoard.articles.images.at(userConnection, {
      articleId: article1.id,
      imageId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // Test 2: Mismatched article-image relationship (image belongs to different article)
  await TestValidator.error(
    "mismatched article-image relationship",
    async () => {
      await api.functional.discussionBoard.articles.images.at(userConnection, {
        articleId: article1.id,
        imageId: image2.id,
      });
    },
  );
  // Test 3: Non-existent article ID with valid image ID
  await TestValidator.error("non-existent article ID", async () => {
    await api.functional.discussionBoard.articles.images.at(userConnection, {
      articleId: typia.random<string & tags.Format<"uuid">>(),
      imageId: image1.id,
    });
  });
  // Test 4: Both article and image IDs are non-existent
  await TestValidator.error(
    "both article and image IDs non-existent",
    async () => {
      await api.functional.discussionBoard.articles.images.at(userConnection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        imageId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Validate that valid requests work correctly
  const validImage1 = await api.functional.discussionBoard.articles.images.at(
    userConnection,
    {
      articleId: article1.id,
      imageId: image1.id,
    },
  );
  typia.assert(validImage1);
  const validImage2 = await api.functional.discussionBoard.articles.images.at(
    userConnection,
    {
      articleId: article2.id,
      imageId: image2.id,
    },
  );
  typia.assert(validImage2);
  // Validate image properties
  TestValidator.equals(
    "image1 belongs to article1",
    validImage1.article.id,
    article1.id,
  );
  TestValidator.equals(
    "image2 belongs to article2",
    validImage2.article.id,
    article2.id,
  );
}
