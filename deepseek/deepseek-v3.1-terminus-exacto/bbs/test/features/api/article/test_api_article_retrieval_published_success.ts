import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful retrieval of a published article by any authenticated user.
 * Validates that published articles are accessible to all authenticated users
 * regardless of article ownership, with complete field validation.
 */
export async function test_api_article_retrieval_published_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin123",
    display_name: RandomGenerator.name(),
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  const adminLoginCredentials = {
    email: adminCredentials.email,
    password: adminCredentials.password,
    href: adminCredentials.href,
    referrer: adminCredentials.referrer,
    ip: adminCredentials.ip,
  } satisfies IDiscussionBoardAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: adminLoginCredentials });
  // 2. Create section as administrator
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 1,
      },
    },
  );
  typia.assert(section);
  // 3. Create and authenticate first user (article author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "user123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  await authorize_user_join(authorConnection, { body: authorCredentials });
  const authorLoginCredentials = {
    email: authorCredentials.email,
    password: authorCredentials.password,
  } satisfies IDiscussionBoardUser.ILogin;
  await authorize_user_login(authorConnection, {
    body: authorLoginCredentials,
  });
  // 4. Create article as author
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Create and authenticate second user (different from author)
  const readerConnection: api.IConnection = { host: connection.host };
  const readerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "user456",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  await authorize_user_join(readerConnection, { body: readerCredentials });
  const readerLoginCredentials = {
    email: readerCredentials.email,
    password: readerCredentials.password,
  } satisfies IDiscussionBoardUser.ILogin;
  await authorize_user_login(readerConnection, {
    body: readerLoginCredentials,
  });
  // 6. Test article retrieval by different authenticated user
  const retrievedArticle =
    await api.functional.discussionBoard.user.articles.at(readerConnection, {
      articleId: article.id,
    });
  typia.assert(retrievedArticle);
  // 7. Validate retrieved article fields
  TestValidator.equals("article ID matches", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article status is published",
    retrievedArticle.status,
    "published",
  );
  TestValidator.equals(
    "author ID matches",
    retrievedArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedArticle.author.display_name,
    article.author.display_name,
  );
  TestValidator.equals(
    "section ID matches",
    retrievedArticle.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedArticle.section.name,
    article.section.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedArticle.section.description,
    article.section.description,
  );
  // 8. Verify timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedArticle.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", retrievedArticle.deleted_at, null);
}
