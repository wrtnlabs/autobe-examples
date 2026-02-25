import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test that the system enforces the 25MB total image size limit per article.
 *
 * Workflow:
 * 1. Register a new user via join endpoint
 * 2. Create a new article owned by this user
 * 3. Attach multiple images accumulating to 24MB total (six 4MB images)
 * 4. Attempt to attach an additional 2MB image that would exceed the 25MB total limit
 *
 * Validation Points:
 * - Initial images within the 25MB total limit attach successfully
 * - The final image that would push total over 25MB is rejected with error
 * - The system correctly calculates cumulative size across all existing images
 */
export async function test_api_article_image_size_limit_exceeded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Attach images totaling 24MB (6 x 4MB) - within the 25MB limit
  const fourMB = 4 * 1024 * 1024; // 4,194,304 bytes
  for (let i = 0; i < 6; i++) {
    const image =
      await generate_random_discussion_board_user_articles_images_create_image(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            original_filename: `image_${i}.jpg`,
            storage_path: `https://storage.example.com/images/${typia.random<string & tags.Format<"uuid">>()}`,
            file_size: fourMB,
            mime_type: "image/jpeg",
            width: 1920,
            height: 1080,
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    typia.assert(image);
  }
  // 4. Attempt to attach another image that would exceed 25MB limit
  // Current total: 24MB, adding 2MB would make 26MB > 25MB limit
  const twoMB = 2 * 1024 * 1024; // 2,097,152 bytes
  await TestValidator.error(
    "should reject image exceeding 25MB total limit",
    async () => {
      await generate_random_discussion_board_user_articles_images_create_image(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            original_filename: "overflow.jpg",
            storage_path: `https://storage.example.com/images/${typia.random<string & tags.Format<"uuid">>()}`,
            file_size: twoMB,
            mime_type: "image/jpeg",
            width: 1920,
            height: 1080,
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    },
  );
}
