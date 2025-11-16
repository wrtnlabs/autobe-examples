import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator article updates enforce content validation constraints.
 *
 * This test validates that even moderators cannot bypass content validation
 * rules when updating articles. It ensures data quality is maintained through
 * proper title and body length constraints regardless of user role.
 *
 * Workflow:
 *
 * 1. Create member account and authenticate
 * 2. Member creates a valid article
 * 3. Create moderator account and authenticate
 * 4. Test title validation with too short title (< 5 chars) - should fail
 * 5. Test title validation with too long title (> 200 chars) - should fail
 * 6. Test body validation with too short body (< 10 chars) - should fail
 * 7. Test body validation with too long body (> 50,000 chars) - should fail
 * 8. Perform valid update with proper constraints - should succeed
 * 9. Verify successful update
 */
export async function test_api_article_moderator_update_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a valid article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Test title too short (< 5 characters) - should fail
  await TestValidator.error(
    "title below minimum length should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            title: RandomGenerator.alphabets(3),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // Step 5: Test title too long (> 200 characters) - should fail
  await TestValidator.error(
    "title exceeding maximum length should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            title: RandomGenerator.alphabets(201),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // Step 6: Test body too short (< 10 characters) - should fail
  await TestValidator.error(
    "body below minimum length should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            body: RandomGenerator.alphabets(5),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // Step 7: Test body too long (> 50,000 characters) - should fail
  await TestValidator.error(
    "body exceeding maximum length should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            body: RandomGenerator.alphabets(50001),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // Step 8: Perform valid update with proper constraints
  const validTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const validBody = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: article.id,
      body: {
        title: validTitle,
        body: validBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 9: Verify successful update
  TestValidator.equals(
    "updated title matches",
    updatedArticle.title,
    validTitle,
  );
  TestValidator.equals("updated body matches", updatedArticle.body, validBody);
  TestValidator.equals("article ID unchanged", updatedArticle.id, article.id);
}
