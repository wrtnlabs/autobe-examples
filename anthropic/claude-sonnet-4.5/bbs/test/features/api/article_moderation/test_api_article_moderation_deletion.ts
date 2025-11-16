import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to soft delete any article regardless of authorship.
 *
 * This test validates that moderators have elevated content management
 * privileges that override normal author ownership restrictions. A member
 * creates an article, then a different moderator account deletes that article,
 * demonstrating that moderation permissions supersede authorship for content
 * management purposes.
 *
 * The test ensures:
 *
 * 1. Member can successfully create an article
 * 2. Moderator can authenticate with separate credentials
 * 3. Moderator can delete articles they didn't author
 * 4. Soft deletion sets deleted_at timestamp while preserving data
 * 5. Article content remains intact for audit trail purposes
 */
export async function test_api_article_moderation_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      ip: undefined,
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates an article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const createdArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(createdArticle);

  // Verify article was created successfully with null deleted_at
  TestValidator.equals(
    "article created with null deleted_at",
    createdArticle.deleted_at,
    null,
  );
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article author is member",
    createdArticle.author.id,
    member.id,
  );

  // Step 3: Create and authenticate as moderator (different account)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      ip: undefined,
      href: "https://example.com/moderator/signup" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator performs soft deletion on member's article
  const deletedArticle =
    await api.functional.discussionBoard.moderator.articles.erase(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 5: Validate soft deletion results
  TestValidator.predicate(
    "article has been soft deleted with deleted_at timestamp",
    deletedArticle.deleted_at !== null,
  );

  // Verify article data is preserved for audit trail
  TestValidator.equals(
    "article ID preserved",
    deletedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title preserved",
    deletedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body preserved",
    deletedArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article author preserved",
    deletedArticle.author.id,
    member.id,
  );

  // Verify view count and other metadata preserved
  TestValidator.equals(
    "view count preserved",
    deletedArticle.view_count,
    createdArticle.view_count,
  );
  TestValidator.equals(
    "created_at preserved",
    deletedArticle.created_at,
    createdArticle.created_at,
  );
}
