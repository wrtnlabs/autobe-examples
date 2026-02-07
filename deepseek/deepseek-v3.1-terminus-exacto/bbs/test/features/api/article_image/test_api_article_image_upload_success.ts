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

/**
 * Test the successful upload of an image attachment to a user's own article.
 * 1. Create a new user account
 * 2. Create an article with a valid section
 * 3. Upload an image with metadata including display order, alt text, and caption
 * 4. Validate that the image is properly associated with the article
 */
export async function test_api_article_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create user account
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // For a realistic test, we need a valid section_id
  // Since sections are created by administrators, we'll use a realistic approach
  // by creating a section first (this would require admin setup in a real scenario)
  // 2. Create article with prepared data
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        // section_id will be handled by the prepare function
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // 3. Upload image attachment with prepared data
  const image =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
          // attachment_file_id will be handled by the prepare function
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(image);
  // 4. Validate image properties
  TestValidator.equals(
    "image should reference the correct article",
    image.article.id,
    article.id,
  );
  TestValidator.predicate(
    "image should have file metadata",
    image.file !== undefined,
  );
  TestValidator.predicate(
    "image should have valid display order",
    image.display_order > 0,
  );
  TestValidator.predicate(
    "image should have valid status",
    ["uploaded", "processing", "active", "archived", "deleted"].includes(
      image.status,
    ),
  );
}
