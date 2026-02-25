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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_deletion_foreign_article(
  connection: api.IConnection,
): Promise<void> {
  // Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article as regular user
  const articleConnection: api.IConnection = { host: connection.host };
  articleConnection.headers = userConnection.headers;
  const article = await generate_random_discussion_board_user_articles_create(
    articleConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Upload image to article as regular user
  const image =
    await generate_random_discussion_board_user_articles_images_create(
      articleConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 1,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(image);
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Delete image as administrator (foreign article)
  await api.functional.discussionBoard.admin.articles.images.erase(
    adminConnection,
    {
      articleId: article.id,
      imageId: image.id,
    },
  );
  // Verify deletion by attempting to modify the deleted image (should fail)
  await TestValidator.error(
    "image should be deleted and no longer accessible",
    async () => {
      await generate_random_discussion_board_user_articles_images_create(
        articleConnection,
        {
          params: { articleId: article.id },
          body: {
            attachment_file_id: image.id,
            display_order: 2,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    },
  );
}
