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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test administrator access to draft and archived articles.
 *
 * This test validates that administrators can access articles with non-published
 * statuses (draft, archived) which are restricted from regular users.
 * Creates articles with draft and archived statuses and verifies that
 * administrators can retrieve them with full content.
 */
export async function test_api_article_retrieval_admin_access_draft(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create a valid section ID for article creation
  // Since we don't have section creation API, use a random UUID that represents an existing section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create draft article
  const draftArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: sectionId,
          status: "draft" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle);
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
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test admin access to draft article
  const retrievedDraft = await api.functional.discussionBoard.articles.at(
    adminConnection,
    { articleId: draftArticle.id },
  );
  typia.assert(retrievedDraft);
  // Validate draft article content
  TestValidator.equals(
    "draft article title matches",
    retrievedDraft.title,
    draftArticle.title,
  );
  TestValidator.equals(
    "draft article content matches",
    retrievedDraft.content,
    draftArticle.content,
  );
  TestValidator.equals(
    "draft article status is draft",
    retrievedDraft.status,
    "draft",
  );
  // Create archived article
  const archivedArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: sectionId,
          status: "archived" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(archivedArticle);
  // Test admin access to archived article
  const retrievedArchived = await api.functional.discussionBoard.articles.at(
    adminConnection,
    { articleId: archivedArticle.id },
  );
  typia.assert(retrievedArchived);
  // Validate archived article content
  TestValidator.equals(
    "archived article title matches",
    retrievedArchived.title,
    archivedArticle.title,
  );
  TestValidator.equals(
    "archived article content matches",
    retrievedArchived.content,
    archivedArticle.content,
  );
  TestValidator.equals(
    "archived article status is archived",
    retrievedArchived.status,
    "archived",
  );
}
