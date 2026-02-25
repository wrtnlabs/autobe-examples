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
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test administrator retrieval of complete article details.
 * Validates that administrators can access articles with different statuses
 * (published, draft, archived) and retrieve all populated fields including
 * author information, section details, timestamp metadata, and content.
 * Also verifies error handling for non-existent articles.
 */
export async function test_api_article_admin_retrieve_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create articles with different statuses
  const publishedArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(publishedArticle);
  const draftArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(draftArticle);
  const archivedArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(archivedArticle);
  // Retrieve published article
  const retrievedPublished =
    await api.functional.discussionBoard.admin.articles.at(adminConnection, {
      articleId: publishedArticle.id,
    });
  typia.assert(retrievedPublished);
  // Validate all populated fields for published article
  TestValidator.equals(
    "published article ID",
    retrievedPublished.id,
    publishedArticle.id,
  );
  TestValidator.equals(
    "published article title",
    retrievedPublished.title,
    publishedArticle.title,
  );
  TestValidator.equals(
    "published article content",
    retrievedPublished.content,
    publishedArticle.content,
  );
  TestValidator.predicate(
    "published article has author",
    retrievedPublished.author.id !== undefined,
  );
  TestValidator.predicate(
    "published article has section",
    retrievedPublished.section.id !== undefined,
  );
  TestValidator.predicate(
    "published article has created_at",
    retrievedPublished.created_at !== undefined,
  );
  TestValidator.predicate(
    "published article has updated_at",
    retrievedPublished.updated_at !== undefined,
  );
  // Retrieve draft article
  const retrievedDraft = await api.functional.discussionBoard.admin.articles.at(
    adminConnection,
    { articleId: draftArticle.id },
  );
  typia.assert(retrievedDraft);
  // Validate all populated fields for draft article
  TestValidator.equals("draft article ID", retrievedDraft.id, draftArticle.id);
  TestValidator.equals(
    "draft article title",
    retrievedDraft.title,
    draftArticle.title,
  );
  TestValidator.equals(
    "draft article content",
    retrievedDraft.content,
    draftArticle.content,
  );
  TestValidator.predicate(
    "draft article has author",
    retrievedDraft.author.id !== undefined,
  );
  TestValidator.predicate(
    "draft article has section",
    retrievedDraft.section.id !== undefined,
  );
  TestValidator.predicate(
    "draft article has created_at",
    retrievedDraft.created_at !== undefined,
  );
  TestValidator.predicate(
    "draft article has updated_at",
    retrievedDraft.updated_at !== undefined,
  );
  // Retrieve archived article
  const retrievedArchived =
    await api.functional.discussionBoard.admin.articles.at(adminConnection, {
      articleId: archivedArticle.id,
    });
  typia.assert(retrievedArchived);
  // Validate all populated fields for archived article
  TestValidator.equals(
    "archived article ID",
    retrievedArchived.id,
    archivedArticle.id,
  );
  TestValidator.equals(
    "archived article title",
    retrievedArchived.title,
    archivedArticle.title,
  );
  TestValidator.equals(
    "archived article content",
    retrievedArchived.content,
    archivedArticle.content,
  );
  TestValidator.predicate(
    "archived article has author",
    retrievedArchived.author.id !== undefined,
  );
  TestValidator.predicate(
    "archived article has section",
    retrievedArchived.section.id !== undefined,
  );
  TestValidator.predicate(
    "archived article has created_at",
    retrievedArchived.created_at !== undefined,
  );
  TestValidator.predicate(
    "archived article has updated_at",
    retrievedArchived.updated_at !== undefined,
  );
  // Test error handling for non-existent article
  await TestValidator.httpError(
    "non-existent article returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.articles.at(adminConnection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
