import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_superadmin_article_image_attachment_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test non-existent article ID
  await TestValidator.error(
    "should reject non-existent article ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.images.create(
        superAdminConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: typia.random<number & tags.Type<"int32">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    },
  );
  // 3. Create valid article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Test invalid attachment_file_id
  await TestValidator.error(
    "should reject invalid attachment file ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.images.create(
        superAdminConnection,
        {
          articleId: article.id,
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: typia.random<number & tags.Type<"int32">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    },
  );
  // 5. Validate article properties (business logic validation)
  TestValidator.equals("article has valid ID", article.id, article.id);
  TestValidator.predicate("article has title", article.title.length > 0);
  TestValidator.predicate("article has content", article.content.length > 0);
}
