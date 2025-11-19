import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test authentication enforcement for comment update operation.
 *
 * Validates that the comment update API endpoint requires valid contributor
 * authentication. The test creates a contributor account, publishes an article,
 * creates a comment on it, then attempts to update the comment without
 * providing valid authentication credentials. The system should reject the
 * update request with HTTP 401 Unauthorized status.
 *
 * This test ensures that:
 *
 * 1. Contributors can create and manage their comments when authenticated
 * 2. The API enforces authentication requirements for sensitive operations
 * 3. Unauthenticated or improperly authenticated requests are properly rejected
 *
 * Steps:
 *
 * 1. Create a contributor account via authentication registration
 * 2. Create an article draft with valid contributor authentication
 * 3. Create a moderator account to approve the article
 * 4. Approve the article via moderator authentication
 * 5. Re-authenticate as contributor for comment creation
 * 6. Create a comment on the published article
 * 7. Create unauthenticated connection (no Authorization header)
 * 8. Attempt to update comment with unauthenticated connection
 * 9. Verify HTTP 401 Unauthorized error is returned
 */
export async function test_api_comment_update_missing_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!@#";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(8),
      password: contributorPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Create authenticated connection for contributor
  const contributorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${contributor.token.access}` },
  };

  // Step 2: Create article draft
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      contributorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!@#";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Create authenticated connection for moderator
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${moderator.token.access}` },
  };

  // Step 4: Approve article
  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      moderatorConnection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Article approved for publication",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);

  // Step 5 & 6: Create comment on published article with contributor authentication
  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      contributorConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 2,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 8 & 9: Attempt to update comment without authentication
  await TestValidator.httpError(
    "comment update without authentication should return 401 Unauthorized",
    401,
    async () => {
      return await api.functional.discussionBoard.contributor.articles.comments.update(
        unauthenticatedConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 2,
              wordMax: 7,
            }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
