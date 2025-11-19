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

export async function test_api_comment_update_unauthorized_contributor(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first contributor (comment author)
  const contributorA = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributorA);

  // 2. Create article by contributor A
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 4,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create moderator and approve article
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Approved for testing",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);

  // 4. Create comment by contributor A
  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Create and authenticate second contributor (unauthorized updater)
  const contributorB = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributorB);

  // 6. Attempt unauthorized update of contributor A's comment by contributor B
  await TestValidator.error(
    "unauthorized contributor should not be able to update another contributor's comment",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 6,
            }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
