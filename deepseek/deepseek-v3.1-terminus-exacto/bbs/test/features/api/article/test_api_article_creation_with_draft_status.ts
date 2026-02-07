import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test article creation with explicit draft status instead of default published status.
 * Validate that articles can be created in draft state and remain invisible to general users
 * while allowing the author to continue editing. Verify that draft articles can be later
 * updated to published status. Ensure the system correctly handles the status field and
 * maintains proper workflow for draft-to-published transitions.
 */
export async function test_api_article_creation_with_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // Generate a random section ID for article creation
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Create article with explicit draft status
  const draftArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 3,
            sentenceMax: 8,
          }),
          section_id: sectionId,
          status: "draft" as const,
        },
      },
    );
  typia.assert(draftArticle);
  // Validate draft article properties
  TestValidator.equals(
    "draft article has draft status",
    draftArticle.status,
    "draft",
  );
  TestValidator.predicate(
    "draft article has valid title",
    draftArticle.title.length >= 5,
  );
  TestValidator.predicate(
    "draft article has valid content",
    draftArticle.content.length >= 50,
  );
  TestValidator.equals(
    "draft article has correct section ID",
    draftArticle.section.id,
    sectionId,
  );
  // Test 2: Create article with published status for comparison
  const publishedArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 3,
            sentenceMax: 8,
          }),
          section_id: sectionId,
          status: "published" as const,
        },
      },
    );
  typia.assert(publishedArticle);
  // Validate published article properties
  TestValidator.equals(
    "published article has published status",
    publishedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published article has valid title",
    publishedArticle.title.length >= 5,
  );
  TestValidator.predicate(
    "published article has valid content",
    publishedArticle.content.length >= 50,
  );
  TestValidator.equals(
    "published article has correct section ID",
    publishedArticle.section.id,
    sectionId,
  );
  // Test 3: Verify articles have different IDs and timestamps
  TestValidator.notEquals(
    "draft and published articles have different IDs",
    draftArticle.id,
    publishedArticle.id,
  );
  TestValidator.notEquals(
    "draft and published articles have different creation timestamps",
    draftArticle.created_at,
    publishedArticle.created_at,
  );
  // Test 4: Validate author information matches
  TestValidator.equals(
    "draft article author matches authenticated user",
    draftArticle.author.id,
    user.id,
  );
  TestValidator.equals(
    "published article author matches authenticated user",
    publishedArticle.author.id,
    user.id,
  );
  // Test 5: Verify section information is consistent
  TestValidator.equals(
    "draft article section matches",
    draftArticle.section.id,
    sectionId,
  );
  TestValidator.equals(
    "published article section matches",
    publishedArticle.section.id,
    sectionId,
  );
}
