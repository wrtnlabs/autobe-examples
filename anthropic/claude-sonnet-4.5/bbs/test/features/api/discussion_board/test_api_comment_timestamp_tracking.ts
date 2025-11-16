import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_comment_timestamp_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register a member for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an article to attach comments to
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Create a comment and capture timestamps
  const beforeCreation = new Date();

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  const afterCreation = new Date();

  // Step 4: Validate timestamp format and properties
  // typia.assert already validates ISO 8601 format via tags.Format<"date-time">

  // Step 5: Verify created_at is set to current time (within test execution window)
  const createdAtDate = new Date(comment.created_at);
  TestValidator.predicate(
    "created_at should be within test execution timeframe",
    createdAtDate >= beforeCreation && createdAtDate <= afterCreation,
  );

  // Step 6: Verify updated_at is set to current time
  const updatedAtDate = new Date(comment.updated_at);
  TestValidator.predicate(
    "updated_at should be within test execution timeframe",
    updatedAtDate >= beforeCreation && updatedAtDate <= afterCreation,
  );

  // Step 7: Verify created_at matches updated_at for newly created comment
  TestValidator.equals(
    "updated_at should match created_at for new comment",
    comment.updated_at,
    comment.created_at,
  );

  // Step 8: Verify timestamps are not in the future
  const now = new Date();
  TestValidator.predicate(
    "created_at should not be in the future",
    createdAtDate <= now,
  );
  TestValidator.predicate(
    "updated_at should not be in the future",
    updatedAtDate <= now,
  );
}
