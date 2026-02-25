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

export async function test_api_article_tags_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as superAdmin
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create an article
  const article =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
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
  // Test tag normalization (trimming and lowercasing)
  const tagWithSpaces = "  TEST TAG  ";
  const normalizedTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: tagWithSpaces,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(normalizedTag);
  TestValidator.equals(
    "tag name should be normalized",
    normalizedTag.tag_name,
    tagWithSpaces.trim().toLowerCase(),
  );
  // Test duplicate tag prevention
  const duplicateTag = "duplicate-tag";
  const firstTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: duplicateTag,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(firstTag);
  await TestValidator.error("should prevent duplicate tags", async () => {
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: duplicateTag,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // Test maximum 10 tags constraint
  const tagsToAdd = ArrayUtil.repeat(9, (index) => `tag-${index}`);
  for (const tagName of tagsToAdd) {
    const tag =
      await api.functional.discussionBoard.superAdmin.articles.tags.create(
        superAdminConnection,
        {
          articleId: article.id,
          body: {
            tag_name: tagName,
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    typia.assert(tag);
  }
  // Try to add the 11th tag (should fail)
  await TestValidator.error(
    "should prevent adding more than 10 tags",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.tags.create(
        superAdminConnection,
        {
          articleId: article.id,
          body: {
            tag_name: "eleventh-tag",
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    },
  );
  // Verify tag entity contains all expected fields
  const sampleTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: "test-validation-tag",
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(sampleTag);
  TestValidator.equals("tag should have ID", typeof sampleTag.id, "string");
  TestValidator.equals(
    "tag should have tag_name",
    typeof sampleTag.tag_name,
    "string",
  );
  TestValidator.equals(
    "tag should have article relationship",
    sampleTag.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "tag should have created_at",
    typeof sampleTag.created_at,
    "string",
  );
  TestValidator.equals(
    "tag should have updated_at",
    typeof sampleTag.updated_at,
    "string",
  );
  TestValidator.predicate(
    "tag should have article summary",
    sampleTag.article !== undefined,
  );
  TestValidator.equals(
    "article summary should match parent article",
    sampleTag.article.id,
    article.id,
  );
}
