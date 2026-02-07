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
 * Test updating an article by changing its section assignment.
 * Authenticate as a regular user, create an article in one section,
 * then update the article to assign it to a different section.
 * Validate that the section change is successful, the article is
 * properly reassigned to the new section, and the response reflects
 * the updated section information. Verify that the target section
 * exists and is active before allowing the section change.
 */
export async function test_api_article_update_section_change(
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
  // Create initial article with valid section data
  const originalArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(originalArticle);
  // Create a new target section ID (simulating existing active section)
  const targetSectionId = typia.random<string & tags.Format<"uuid">>();
  // Update the article with the new section assignment
  const updatedArticle =
    await api.functional.discussionBoard.user.articles.update(userConnection, {
      articleId: originalArticle.id,
      body: {
        discussion_board_section_id: targetSectionId,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);
  // Validate that the section was successfully changed
  TestValidator.equals(
    "article ID should remain the same",
    updatedArticle.id,
    originalArticle.id,
  );
  TestValidator.notEquals(
    "section should be different",
    updatedArticle.section.id,
    originalArticle.section.id,
  );
  TestValidator.equals(
    "new section ID should match the update request",
    updatedArticle.section.id,
    targetSectionId,
  );
  TestValidator.predicate(
    "section should have active status",
    updatedArticle.section.status === "active",
  );
}
