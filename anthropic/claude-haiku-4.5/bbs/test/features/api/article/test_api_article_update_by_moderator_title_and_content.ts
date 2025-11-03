import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to update any article title and content regardless
 * of authorship.
 *
 * A member creates an article with initial title and content. A moderator
 * authenticates and updates the article's title and content to new values. The
 * system creates a new revision record, increments the revision_number, and
 * updates the updated_at timestamp while preserving the original creation date
 * and author attribution. The test verifies that the article's modifications
 * are recorded properly for audit trail purposes.
 *
 * Workflow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create and authenticate member account
 * 3. Member creates article with initial content
 * 4. Moderator authenticates
 * 5. Moderator updates article title and content
 * 6. Verify updated article reflects new values
 * 7. Verify revision tracking and timestamp management
 */
export async function test_api_article_update_by_moderator_title_and_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123";

  const moderatorJoinBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.IJoin;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created and authorized",
    moderator.account_status === "active",
  );

  // Step 2: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created and authorized",
    member.id !== null && member.id !== undefined,
  );

  // Step 3: Member creates article with initial content
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const categoryCode = "economics";

  const articleCreateBody = {
    title: initialTitle,
    content: initialContent,
    category_code: categoryCode,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "article title matches created",
    createdArticle.title,
    initialTitle,
  );
  TestValidator.equals(
    "article content matches created",
    createdArticle.content,
    initialContent,
  );
  TestValidator.equals(
    "article author is member",
    createdArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "article initial revision is 0",
    createdArticle.revision_number,
    0,
  );

  const originalCreatedAt = createdArticle.created_at;
  const originalAuthorId = createdArticle.author.id;

  // Step 4: Moderator authenticates
  const moderatorLoginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });
  typia.assert(moderatorLogin);

  // Step 5: Moderator updates article title and content
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 6,
    sentenceMax: 12,
  });

  const articleUpdateBody = {
    title: updatedTitle,
    content: updatedContent,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: createdArticle.id,
      body: articleUpdateBody,
    });
  typia.assert(updatedArticle);

  // Step 6: Verify updated article reflects new values
  TestValidator.equals(
    "article title was updated",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "article content was updated",
    updatedArticle.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "title changed from original",
    updatedArticle.title,
    initialTitle,
  );
  TestValidator.notEquals(
    "content changed from original",
    updatedArticle.content,
    initialContent,
  );

  // Step 7: Verify revision tracking and timestamp management
  TestValidator.equals(
    "revision number incremented",
    updatedArticle.revision_number,
    1,
  );
  TestValidator.equals(
    "original creation date preserved",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedArticle.updated_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "author attribution preserved",
    updatedArticle.author.id,
    originalAuthorId,
  );

  // Verify article status remains published
  TestValidator.equals(
    "article status is published",
    updatedArticle.status,
    "published",
  );
}
