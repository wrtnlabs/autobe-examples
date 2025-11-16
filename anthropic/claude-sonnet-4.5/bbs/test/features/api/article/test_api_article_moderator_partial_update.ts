import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to perform partial updates on articles.
 *
 * This test validates that moderators can update individual fields of an
 * article without affecting other fields. It verifies:
 *
 * 1. Member creates an article with initial title and body
 * 2. Moderator updates only the title field
 * 3. Body remains unchanged after title update
 * 4. Moderator updates only the body field
 * 5. Title (from previous update) remains unchanged after body update
 * 6. Each update refreshes the updated_at timestamp
 */
export async function test_api_article_moderator_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates article with specific initial content
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: initialTitle,
        body: initialBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "initial article title matches",
    createdArticle.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial article body matches",
    createdArticle.body,
    initialBody,
  );

  // Step 3: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator updates only the title field
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 12,
  });

  const afterTitleUpdate =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: updatedTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(afterTitleUpdate);

  // Step 5: Verify title is updated while body remains unchanged
  TestValidator.equals(
    "title is updated",
    afterTitleUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "body remains unchanged after title update",
    afterTitleUpdate.body,
    initialBody,
  );
  TestValidator.predicate(
    "updated_at is refreshed after title update",
    new Date(afterTitleUpdate.updated_at).getTime() >
      new Date(createdArticle.updated_at).getTime(),
  );

  // Step 6: Moderator updates only the body field in a second update
  const updatedBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const afterBodyUpdate =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        body: updatedBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(afterBodyUpdate);

  // Step 7: Verify body is updated while title remains from previous update
  TestValidator.equals("body is updated", afterBodyUpdate.body, updatedBody);
  TestValidator.equals(
    "title remains from previous update",
    afterBodyUpdate.title,
    updatedTitle,
  );
  TestValidator.predicate(
    "updated_at is refreshed after body update",
    new Date(afterBodyUpdate.updated_at).getTime() >
      new Date(afterTitleUpdate.updated_at).getTime(),
  );

  // Final verification: ensure all changes are reflected correctly
  TestValidator.notEquals(
    "final title differs from initial",
    afterBodyUpdate.title,
    initialTitle,
  );
  TestValidator.notEquals(
    "final body differs from initial",
    afterBodyUpdate.body,
    initialBody,
  );
}
