import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test proper access control and error handling when retrieving images from articles.
 * 1. Authenticate as admin
 * 2. Create an article as admin user
 * 3. Upload an image attachment to the article
 * 4. Test error scenarios:
 *    - Invalid article ID (non-existent article)
 *    - Invalid image ID (non-existent image)
 * 5. Verify 404 Not Found status codes with appropriate error messages
 */
export async function test_api_article_image_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create an article
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Upload an image attachment to the article
  const image =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(image);
  // 4. Test valid image retrieval first
  const validImage =
    await api.functional.discussionBoard.admin.articles.images.at(
      adminConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  typia.assert(validImage);
  TestValidator.equals("valid image ID", validImage.id, image.id);
  // 5. Test invalid article ID scenario
  await TestValidator.httpError(
    "invalid article ID should return 404",
    [404],
    async () => {
      await api.functional.discussionBoard.admin.articles.images.at(
        adminConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          imageId: image.id,
        },
      );
    },
  );
  // 6. Test invalid image ID scenario
  await TestValidator.httpError(
    "invalid image ID should return 404",
    [404],
    async () => {
      await api.functional.discussionBoard.admin.articles.images.at(
        adminConnection,
        {
          articleId: article.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
