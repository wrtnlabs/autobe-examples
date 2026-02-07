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

export async function test_api_article_multiple_image_upload_with_ordering(
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
  // 2. Create article - use a realistic UUID format for section_id
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This will be validated by the API
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Upload images with sequential display orders
  const imageOrders = [1, 2, 3];
  const uploadedImages: IDiscussionBoardArticleImage[] = [];
  for (const order of imageOrders) {
    const image =
      await generate_random_discussion_board_user_articles_images_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(), // This will be validated by the API
            display_order: order satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
    // Validate display order
    TestValidator.equals(
      `image ${order} display order`,
      image.display_order,
      order,
    );
  }
  // 4. Validate ordering consistency
  TestValidator.equals(
    "correct number of images uploaded",
    uploadedImages.length,
    imageOrders.length,
  );
  // 5. Verify sequential ordering
  for (let i = 0; i < uploadedImages.length; i++) {
    TestValidator.equals(
      `image ${i + 1} has correct order`,
      uploadedImages[i].display_order,
      i + 1,
    );
  }
  // 6. Validate all images belong to the same article
  for (const image of uploadedImages) {
    TestValidator.equals(
      "image belongs to correct article",
      image.article.id,
      article.id,
    );
  }
  // 7. Validate image status and metadata
  for (const image of uploadedImages) {
    TestValidator.predicate(
      "image has valid status",
      ["uploaded", "processing", "active", "archived", "deleted"].includes(
        image.status,
      ),
    );
    TestValidator.predicate(
      "image has file metadata",
      image.file !== undefined && image.file.id !== undefined,
    );
  }
}
