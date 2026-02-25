import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_super_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tags_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create an article first - need to generate valid title and content
  const article =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<200>
          >(),
          content: typia.random<string & tags.MinLength<50>>(),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Create tag with uppercase and trailing spaces
  const originalTag = "  IMPORTANT  TAG  ";
  const normalizedTag = originalTag.trim().toLowerCase();
  // Add the original tag (should succeed)
  const firstTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: originalTag,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(firstTag);
  // Verify the tag was normalized
  TestValidator.equals(
    "tag name should be normalized",
    firstTag.tag_name,
    normalizedTag,
  );
  // Attempt to add the same tag with different formatting (should fail due to normalization)
  await TestValidator.error("duplicate tag should be rejected", async () => {
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: "IMPORTANT TAG", // Different case, no spaces
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // Test another variation with leading/trailing spaces
  await TestValidator.error(
    "duplicate tag with spaces should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.tags.create(
        superAdminConnection,
        {
          articleId: article.id,
          body: {
            tag_name: "  IMPORTANT tag  ", // Different spacing, mixed case
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    },
  );
  // Add a different tag to ensure the system still works
  const differentTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<50>
          >(),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(differentTag);
  TestValidator.notEquals(
    "different tag should be added",
    differentTag.tag_name,
    firstTag.tag_name,
  );
}
