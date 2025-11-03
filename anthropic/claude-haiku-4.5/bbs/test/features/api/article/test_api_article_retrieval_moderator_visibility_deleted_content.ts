import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can view deleted and archived articles while guests and
 * members cannot.
 *
 * Member creates and publishes an article, then moderator soft-deletes it.
 * Verify guests receive 404 when attempting to retrieve deleted article. Verify
 * members also cannot access deleted article. Verify moderator can retrieve
 * deleted article with full content and deleted status indicator. Validate
 * proper authorization enforcement across user roles for soft-deleted content
 * visibility.
 *
 * 1. Create member account to author the article
 * 2. Member creates and publishes an article
 * 3. Create moderator account with permissions to view deleted content
 * 4. Moderator soft-deletes the article
 * 5. Guest attempts to retrieve deleted article - should receive 404
 * 6. Another member attempts to retrieve deleted article - should receive 404
 * 7. Moderator retrieves deleted article - should succeed with full data and
 *    deleted_at timestamp
 */
export async function test_api_article_retrieval_moderator_visibility_deleted_content(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member should be authorized with token",
    member.token !== null && member.token !== undefined,
  );

  // 2. Member creates an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article status is published",
    createdArticle.status,
    "published",
  );
  TestValidator.predicate(
    "article should not be deleted",
    createdArticle.deleted_at === null ||
      createdArticle.deleted_at === undefined,
  );

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "127.0.0.1",
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should have permissions",
    moderator.permissions !== null && moderator.permissions.length > 0,
  );

  // 4. Moderator soft-deletes the article
  await api.functional.discussionBoard.moderator.articles.erase(connection, {
    articleId: createdArticle.id,
  });

  // 5. Create unauthenticated guest connection (empty headers)
  const guestConn: api.IConnection = { ...connection, headers: {} };

  // Guest attempts to retrieve deleted article - should fail with 404
  await TestValidator.error(
    "guest cannot retrieve deleted article",
    async () => {
      await api.functional.discussionBoard.articles.at(guestConn, {
        articleId: createdArticle.id,
      });
    },
  );

  // 6. Create another member to test member access restrictions
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        password: "TestPass456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);

  // Member2 attempts to retrieve deleted article - should fail with 404
  await TestValidator.error(
    "member cannot retrieve deleted article",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: createdArticle.id,
      });
    },
  );

  // 7. Moderator retrieves deleted article - should succeed
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(retrievedArticle);
  TestValidator.equals(
    "moderator can see deleted article id",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "deleted article retains title",
    retrievedArticle.title,
    articleData.title,
  );
  TestValidator.predicate(
    "deleted article has deleted_at timestamp",
    retrievedArticle.deleted_at !== null &&
      retrievedArticle.deleted_at !== undefined,
  );
  TestValidator.equals(
    "moderator can retrieve deleted article content",
    retrievedArticle.content,
    articleData.content,
  );
}
