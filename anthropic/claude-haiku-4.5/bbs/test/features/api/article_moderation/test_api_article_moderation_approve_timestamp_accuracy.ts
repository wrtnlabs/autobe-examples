import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_moderation_approve_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Register moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create article in pending_approval status (simulated)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const beforeApprovalTime = new Date();

  // Approve article
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: articleId,
        body: {
          approvalNotes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );

  const afterApprovalTime = new Date();
  typia.assert(approvedArticle);

  // Validate published_at timestamp
  TestValidator.predicate(
    "published_at should be set after approval",
    approvedArticle.published_at !== null &&
      approvedArticle.published_at !== undefined,
  );

  if (approvedArticle.published_at) {
    const publishedAtTime = new Date(approvedArticle.published_at);

    TestValidator.predicate(
      "published_at should be between before and after approval times",
      publishedAtTime >= beforeApprovalTime &&
        publishedAtTime <= afterApprovalTime,
    );

    TestValidator.predicate(
      "published_at timestamp should reflect approval moment",
      publishedAtTime.getTime() >= beforeApprovalTime.getTime() &&
        publishedAtTime.getTime() <= afterApprovalTime.getTime(),
    );
  }

  // Validate status transition
  TestValidator.equals(
    "article status should be published after approval",
    approvedArticle.status,
    "published",
  );

  // Validate approvedByModerator is set
  TestValidator.predicate(
    "approvedByModerator should be set to current moderator",
    approvedArticle.approvedByModerator !== null &&
      approvedArticle.approvedByModerator !== undefined,
  );

  // Validate updated_at is also updated
  TestValidator.predicate(
    "updated_at should be updated during approval",
    approvedArticle.updated_at !== null &&
      approvedArticle.updated_at !== undefined,
  );

  const updatedAtTime = new Date(approvedArticle.updated_at);
  TestValidator.predicate(
    "updated_at should reflect the approval modification",
    updatedAtTime >= beforeApprovalTime && updatedAtTime <= afterApprovalTime,
  );

  // Validate approval notes are stored
  TestValidator.predicate(
    "approval_notes should be stored if provided",
    approvedArticle.approval_notes !== null &&
      approvedArticle.approval_notes !== undefined,
  );
}
