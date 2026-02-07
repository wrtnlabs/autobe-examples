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

export async function test_api_article_image_different_status_values(
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
  // Create an article to attach images to
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple images for the article
  const images: IDiscussionBoardArticleImage[] = [];
  for (let i = 0; i < 3; i++) {
    const image =
      await generate_random_discussion_board_user_articles_images_create(
        userConnection,
        {
          params: { articleId: article.id },
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
    typia.assert(image);
    images.push(image);
  }
  // Retrieve each image individually and validate basic properties
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const retrievedImage =
      await api.functional.discussionBoard.articles.images.at(userConnection, {
        articleId: article.id,
        imageId: image.id,
      });
    typia.assert(retrievedImage);
    TestValidator.equals(
      `image ${i + 1} ID should match`,
      retrievedImage.id,
      image.id,
    );
    TestValidator.equals(
      `image ${i + 1} article ID should match`,
      retrievedImage.article.id,
      article.id,
    );
    TestValidator.predicate(
      `image ${i + 1} should have valid status`,
      ["uploaded", "processing", "active", "archived", "deleted"].includes(
        retrievedImage.status,
      ),
    );
    TestValidator.predicate(
      `image ${i + 1} should have valid display order`,
      retrievedImage.display_order > 0,
    );
  }
}
