import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

/**
 * Test successful creation of a new tag on an article.
 * Authenticate as admin via join, create an article, then add a descriptive tag.
 * Verify tag is returned with correct properties including normalized tag_name (lowercase, trimmed),
 * article relationship, and server-generated timestamps.
 * Ensure tag_name matches IDiscussionBoardArticleTag.ICreate schema with 1-50 characters.
 */
export async function test_api_article_tag_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create article first
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Create tag using utility function
  const tag = await generate_random_discussion_board_admin_articles_tags_create(
    adminConnection,
    {
      body: {
        tag_name: RandomGenerator.name(),
      },
      params: {
        articleId: article.id,
      },
    },
  );
  typia.assert(tag);
  // Verify tag properties
  TestValidator.equals("tag ID is string", typeof tag.id, "string");
  // Verify tag_name is normalized (lowercase, trimmed)
  TestValidator.predicate(
    "tag_name is normalized",
    () => tag.tag_name === tag.tag_name.toLowerCase().trim(),
  );
  // Verify article relationship
  TestValidator.equals(
    "article ID matches",
    tag.discussion_board_article_id,
    article.id,
  );
  // Verify server-generated timestamps
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => !isNaN(new Date(tag.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () => !isNaN(new Date(tag.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at is null for active tag",
    tag.deleted_at,
    null,
  );
  // Verify article summary relationship
  TestValidator.equals(
    "article summary ID matches",
    tag.article.id,
    article.id,
  );
  TestValidator.equals(
    "article summary title matches",
    tag.article.title,
    article.title,
  );
  TestValidator.equals(
    "article summary status matches",
    tag.article.status,
    article.status,
  );
  TestValidator.predicate(
    "article summary created_at is valid",
    () => !isNaN(new Date(tag.article.created_at).getTime()),
  );
}
