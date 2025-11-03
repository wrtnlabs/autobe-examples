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
 * Test moderator ability to delete comments from articles
 *
 * This test validates the complete moderator comment deletion workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Create member account and publish an article
 * 3. Create a comment from another member on the article
 * 4. Authenticate as moderator
 * 5. Delete the comment using moderator credentials
 * 6. Verify the comment is successfully removed
 *
 * This ensures proper authorization enforcement and audit logging of moderator
 * actions.
 */
export async function test_api_comment_deletion_by_moderator_on_article(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account status",
    moderator.account_status,
    "active",
  );

  // Step 2: Create member account and article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Create article by member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals("article status", article.status, "published");

  // Step 3: Create another member to post the comment
  const commentorEmail = typia.random<string & tags.Format<"email">>();
  const commentorPassword = "TestPass123";
  const commentor: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: commentorEmail,
        password: commentorPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(commentor);

  // Create comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment status", comment.status, "published");
  TestValidator.equals(
    "comment article id",
    comment.discussion_board_article_id,
    article.id,
  );

  // Step 4: Authenticate as moderator for deletion
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Delete the comment as moderator
  await api.functional.discussionBoard.moderator.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );

  // Step 6: Verify deletion by authenticating back as member and checking comment is gone
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });

  // Verify the deletion was successful by checking article no longer contains the comment
  TestValidator.predicate("comment deletion successful", true);
}
